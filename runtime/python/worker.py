"""Isolated JSON-lines adapter worker. stdout is reserved for framed protocol data."""
import asyncio
import contextlib
import importlib
import json
import logging
import os
from pathlib import Path
import sys
from datetime import datetime, timezone

PROTOCOL = sys.stdout
sys.stdout = sys.stderr
logging.disable(logging.CRITICAL)
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'vendor'))
CATALOG = {item['id']: item for item in json.loads((ROOT / 'catalog.json').read_text())}

def emit(value):
    PROTOCOL.write(json.dumps(value, ensure_ascii=True) + '\n')
    PROTOCOL.flush()

class RegistrationContext:
    """Capture platform factories only; never register agent tools or CLI commands."""
    def __init__(self):
        self.platforms = {}
    def register_platform(self, **entry):
        self.platforms[entry['name']] = entry
    def register_hook(self, *args, **kwargs):
        pass
    def register_cli_command(self, *args, **kwargs):
        pass
    def register_tool(self, *args, **kwargs):
        pass

def build_adapter(channel, settings):
    from gateway.config import PlatformConfig
    entry = CATALOG[channel]
    config = PlatformConfig.from_dict({'enabled': True, **settings})
    module = importlib.import_module(entry['module'])
    if entry['factory'] == 'register':
        context = RegistrationContext()
        module.register(context)
        registered = context.platforms[channel]
        # Some donor probes mix environment/config readiness with SDK availability.
        # Let connect validate actual settings rather than rejecting valid extra config.
        return registered['adapter_factory'](config)
    if channel == 'relay':
        from gateway.relay.descriptor import CapabilityDescriptor
        from gateway.relay.ws_transport import WebSocketRelayTransport
        extra = config.extra
        descriptor = CapabilityDescriptor.from_json(json.dumps(extra['descriptor']))
        transport = WebSocketRelayTransport(extra['url'], extra['platform'], extra['bot_id'],
                                            upgrade_secret=extra.get('upgrade_secret'))
        return module.RelayAdapter(config, descriptor, transport)
    return getattr(module, entry['factory'])(config)

async def main():
    adapter = None
    channel = None
    incoming = {}
    sequence = 0
    tasks = set()
    stopping = asyncio.Event()

    async def monitor_connection():
        while not stopping.is_set():
            await asyncio.sleep(1)
            if adapter and not adapter.is_connected:
                emit({'event': 'state', 'state': 'error'})
                return

    async def on_message(event):
        nonlocal sequence
        sequence += 1
        callback_id = str(sequence)
        source = event.source
        if not source or not event.message_id:
            # Never invent provider identities for deduplication.
            return None
        user_id = getattr(event, 'user_id', None) or getattr(source, 'user_id', None)
        if not user_id:
            return None
        timestamp = getattr(event, 'timestamp', None)
        if isinstance(timestamp, datetime):
            timestamp = timestamp.isoformat()
        if not isinstance(timestamp, str):
            timestamp = datetime.now(timezone.utc).isoformat()
        future = asyncio.get_running_loop().create_future()
        incoming[callback_id] = future
        emit({'event': 'message', 'callbackId': callback_id, 'message': {
            'channel': channel, 'id': str(event.message_id),
            'conversationId': str(source.chat_id), 'senderId': str(user_id),
            'senderName': str(getattr(event, 'user_name', None) or getattr(source, 'user_name', None) or user_id),
            'text': str(event.text or ''), 'timestamp': timestamp,
            'threadId': getattr(source, 'thread_id', None),
            'mediaUrls': list(getattr(event, 'media_urls', []) or []),
        }})
        try:
            await asyncio.wait_for(future, timeout=300)
        finally:
            incoming.pop(callback_id, None)
        return None

    async def execute(request):
        nonlocal adapter, channel
        request_id = request.get('id')
        try:
            operation = request['method']
            if operation == 'start':
                channel = request['channel']
                if channel not in CATALOG:
                    raise ValueError('unknown-channel')
                # Environment configuration is supplied over stdin, never process arguments.
                for key, value in request.get('environment', {}).items():
                    if not isinstance(key, str) or not isinstance(value, str):
                        raise ValueError('invalid-environment')
                    if key in ('PYTHONPATH', 'PYTHONHOME', 'PATH'):
                        raise ValueError('reserved-environment')
                    os.environ[key] = value
                adapter = build_adapter(channel, request.get('settings', {}))
                adapter.set_message_handler(on_message)
                if hasattr(adapter, 'set_fatal_error_handler'):
                    adapter.set_fatal_error_handler(lambda _: emit({'event': 'state', 'state': 'error'}))
                if not await adapter.connect():
                    raise RuntimeError('provider-connect-failed')
                monitor = asyncio.create_task(monitor_connection())
                tasks.add(monitor)
                monitor.add_done_callback(tasks.discard)
                emit({'event': 'state', 'state': 'connected'})
                emit({'id': request_id, 'result': {'connected': True}})
            elif operation == 'send':
                if not adapter or not adapter.is_connected:
                    raise RuntimeError('not-connected')
                result = await adapter.send(request['conversationId'], request['text'])
                if not result.success or not result.message_id:
                    raise RuntimeError('provider-send-failed')
                emit({'id': request_id, 'result': {'id': str(result.message_id),
                                                  'conversationId': request['conversationId'],
                                                  'acknowledgement': 'adapter'}})
            elif operation == 'complete':
                future = incoming.get(request['callbackId'])
                if future and not future.done():
                    future.set_result(None)
            elif operation == 'stop':
                for future in incoming.values():
                    if not future.done():
                        future.cancel()
                if adapter:
                    await asyncio.wait_for(adapter.disconnect(), timeout=10)
                emit({'id': request_id, 'result': {'stopped': True}})
                stopping.set()
            elif operation == 'diagnose':
                results = []
                for key in CATALOG:
                    entry = CATALOG[key]
                    try:
                        module = importlib.import_module(entry['module'])
                        if entry['factory'] == 'register':
                            context = RegistrationContext()
                            module.register(context)
                            factory = callable(context.platforms[key]['adapter_factory'])
                        else:
                            factory = callable(getattr(module, entry['factory']))
                        results.append({'channel': key, 'importable': True, 'factory': factory})
                    except Exception as error:
                        # Only exception type/module name; never exception text or traceback.
                        results.append({'channel': key, 'importable': False,
                                        'error': type(error).__name__,
                                        'missingModule': getattr(error, 'name', None)})
                emit({'id': request_id, 'result': results})
            else:
                raise ValueError('unknown-operation')
        except Exception as error:
            emit({'id': request_id, 'error': {'code': type(error).__name__}})

    # Pipe reads happen in a daemon thread so cancellation does not wait on stdin.
    import threading
    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    def read_lines():
        for line in sys.stdin:
            loop.call_soon_threadsafe(queue.put_nowait, line)
        loop.call_soon_threadsafe(queue.put_nowait, None)
    threading.Thread(target=read_lines, daemon=True).start()
    emit({'event': 'ready', 'protocol': 1})
    while not stopping.is_set():
        wait_line = asyncio.create_task(queue.get())
        wait_stop = asyncio.create_task(stopping.wait())
        done, pending = await asyncio.wait((wait_line, wait_stop), return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        if wait_stop in done:
            break
        line = wait_line.result()
        if line is None:
            break
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ValueError()
        except Exception:
            emit({'error': {'code': 'InvalidFrame'}})
            continue
        task = asyncio.create_task(execute(request))
        tasks.add(task)
        task.add_done_callback(tasks.discard)
    for task in tasks:
        task.cancel()
    if adapter:
        with contextlib.suppress(Exception):
            await asyncio.wait_for(adapter.disconnect(), timeout=10)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
