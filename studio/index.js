import { template, styles, poster } from './assets.js';
import { uiIcon, platformIcons } from './ui-icons.js';

/** Framework-independent editor, platform previews and calendar. Never receives credentials. */
export async function mountSocialStudio(host, options) {
if (!host || !['demo', 'connected'].includes(options?.mode)) throw new Error('A host element and explicit studio mode are required');
if (options.mode === 'connected' && (!Array.isArray(options.posts) || !Array.isArray(options.accounts))) throw new Error('Connected mode requires host-owned posts and accounts');
const configuredAccounts = structuredClone(options.accounts ?? (options.mode === 'demo' ? ['facebook','instagram','linkedin','x','youtube','tiktok'].map(platform => ({platform, id:`demo-${platform}-1`, name:'Sample studio'})) : []));
if (new Set(configuredAccounts.map(a => `${a.platform}:${a.id}`)).size !== configuredAccounts.length) throw new Error('Account IDs must be unique within each platform');
const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
if (root.childNodes.length) throw new Error('The studio host must be empty');
const style = document.createElement('style'); style.textContent = styles;
const content = document.createElement('div'); content.innerHTML = template;
root.append(style, content);
root.querySelectorAll('[data-ui]').forEach(element => { element.innerHTML = uiIcon(element.dataset.ui); });
const $ = id => root.getElementById(id);
const listeners = new AbortController();
const listen = (element, name, handler) => element.addEventListener(name, handler, { signal: listeners.signal });
const demo = options.mode === 'demo';
const availableViews = options.views ?? ['compose','calendar','library','accounts'];
if (!availableViews.length || availableViews.some(view => !['compose','calendar','library','accounts'].includes(view))) throw new Error('Invalid studio views');
root.querySelectorAll('[data-view]').forEach(tab => { tab.hidden = !availableViews.includes(tab.dataset.view); });
root.querySelector('.studio-tabs').hidden = availableViews.length === 1;
$('new-post').hidden = !availableViews.includes('compose');
if (availableViews.length === 1 && availableViews[0] === 'accounts') root.querySelector('.module-title h1').textContent = 'Social accounts';
const shell = root.querySelector('.studio-shell');
function setTheme(theme) {
  if (!['light', 'dark', 'system'].includes(theme)) throw new Error('Invalid studio theme');
  shell.dataset.theme = theme;
}
setTheme(options.theme ?? 'system');
$('new-post').title = 'New post (⌘/Ctrl+N)';
$('new-post').setAttribute('aria-label', 'New post');
root.querySelectorAll('button[aria-label]').forEach(button => { if (!button.title) button.title = button.getAttribute('aria-label'); });
const accountsFor = platform => configuredAccounts.filter(account => account.platform === platform);
const accountFor = platform => accountsFor(platform)[0];
const accountKey = account => `${account.platform}:${account.id}`;
let selectedAccounts = new Set();
let chooserPlatform = null;
const displayName = platform => configuredAccounts.find(account => account.platform === platform && selectedAccounts.has(accountKey(account)))?.name ?? accountFor(platform)?.name ?? 'Your account';

const channels = [
  { id: 'facebook', name: 'Facebook' }, { id: 'instagram', name: 'Instagram' },
  { id: 'linkedin', name: 'LinkedIn' }, { id: 'x', name: 'X' },
  { id: 'youtube', name: 'YouTube' }, { id: 'tiktok', name: 'TikTok' },
].filter(channel => !options.platforms || options.platforms.includes(channel.id));
if (!channels.length) throw new Error('At least one studio platform is required');
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = id => `<span class="platform-icon ${id}" aria-hidden="true"><img src="${platformIcons[id]}" alt="" draggable="false"></span>`;
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const now = new Date();
let calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
let activePreview = channels.some(channel => channel.id === 'instagram') ? 'instagram' : channels[0].id;
let selected = ['facebook', 'instagram', 'linkedin'];
const sampleMedia = { url: poster, kind: 'image', name: 'social-studio-cover.svg', details: '1080 × 1080 · sample artwork' };
let media = { ...sampleMedia };
let editingId = null;
let toastTimer;
let destroyed = false;
let deletedPost = null;
let editorRevision = 0;
let uploadRevision = 0;
const storageKey = options.storageKey ?? 'agent-connect-social-demo-v1';
if (demo) {
  try {
    const savedAccounts = JSON.parse(localStorage.getItem(`${storageKey}:accounts`));
    if (Array.isArray(savedAccounts) && savedAccounts.every(account => channels.some(channel => channel.id === account.platform) && typeof account.id === 'string' && typeof account.name === 'string')) configuredAccounts.splice(0, configuredAccounts.length, ...savedAccounts);
  } catch {}
}
function seed() {
  const date = day => `${localDate(new Date(now.getFullYear(), now.getMonth(), day))}T10:00`;
  return [
    { id: 'sample-1', title: 'One idea. Every channel.', text: 'Your next idea deserves to be seen.\n\nCreate once, make it yours on every channel. ✨\n\n#SocialStudio #CreateAndConnect', channels: ['facebook', 'instagram', 'linkedin'], placement: 'feed', ratio: 'square', schedule: date(Math.min(now.getDate() + 2, 27)), status: 'scheduled', media: { ...sampleMedia }, privacy: 'private' },
    { id: 'sample-2', title: 'A little behind the scenes', text: 'A look at the process behind the post.', channels: ['instagram', 'tiktok'], placement: 'reel', ratio: 'vertical', schedule: date(Math.min(now.getDate() + 4, 28)), status: 'draft', media: null, privacy: 'private' },
    { id: 'sample-3', title: 'This week in the studio', text: 'Three small ideas worth sharing this week.', channels: ['linkedin', 'x'], placement: 'feed', ratio: 'landscape', schedule: date(Math.max(now.getDate() - 2, 1)), status: 'published', media: null, privacy: 'public' },
  ];
}
let posts;
if (!demo) posts = structuredClone(options.posts);
else { try { const saved = JSON.parse(localStorage.getItem(storageKey)); posts = Array.isArray(saved) ? saved : seed(); } catch { posts = seed(); } }
function persist() { if (!demo) return; try { localStorage.setItem(storageKey, JSON.stringify(posts)); localStorage.setItem(`${storageKey}:accounts`, JSON.stringify(configuredAccounts)); } catch { toast('Browser storage unavailable. Changes last for this session only.'); } }
function toast(text, canUndo = false) {
  if (destroyed) return;
  clearTimeout(toastTimer); $('toast-text').textContent = text;
  $('undo-delete').hidden = !canUndo; $('toast').style.display = 'flex';
  toastTimer = setTimeout(() => { if (!destroyed) $('toast').style.display = 'none'; }, 5000);
}
function renderChannels() {
  selectedAccounts = new Set([...selectedAccounts].filter(key => configuredAccounts.some(account => accountKey(account) === key && accountState(account) === 'connected')));
  selected = [...new Set(configuredAccounts.filter(account => selectedAccounts.has(accountKey(account)) && accountState(account) === 'connected').map(account => account.platform))];
  $('selection-summary').textContent = `${selectedAccounts.size} selected`;
  $('channel-picker').innerHTML = channels.map(c => `<button ${!demo && !accountFor(c.id) ? 'disabled' : ''} class="channel ${selected.includes(c.id) ? 'selected' : ''}" data-channel="${c.id}" title="${c.name}" aria-pressed="${selected.includes(c.id)}">${icon(c.id)}${c.name}<span class="account-count">${accountsFor(c.id).filter(account => selectedAccounts.has(accountKey(account))).length}/${accountsFor(c.id).length}</span><span class="channel-check">${selected.includes(c.id) ? uiIcon('check') : uiIcon('plus')}</span></button>`).join('');
  $('preview-tabs').innerHTML = channels.map(c => `<button id="preview-${c.id}" class="preview-tab" role="tab" aria-controls="post-preview" tabindex="${activePreview === c.id ? 0 : -1}" title="${c.name}" data-preview="${c.id}" aria-selected="${activePreview === c.id}" aria-label="${c.name} preview">${icon(c.id)}</button>`).join('');
}
function renderAccountChooser() {
  const panel = $('account-chooser');
  panel.hidden = !chooserPlatform;
  if (panel.hidden) return;
  $('account-chooser-title').textContent = `${channels.find(channel => channel.id === chooserPlatform).name} accounts`;
  const query = $('account-search').value.trim().toLocaleLowerCase();
  const accounts = accountsFor(chooserPlatform).filter(account => `${account.name} ${account.id}`.toLocaleLowerCase().includes(query));
  $('account-choices').innerHTML = accounts.length ? accounts.map(account => `<button class="account-choice" data-account-key="${escape(accountKey(account))}" role="checkbox" ${accountState(account) !== 'connected' ? 'disabled' : ''} aria-checked="${selectedAccounts.has(accountKey(account))}">${icon(account.platform)}<span><strong>${escape(account.name)}</strong><small>${escape(account.id)}</small></span><span class="choice-check">${selectedAccounts.has(accountKey(account)) ? uiIcon('check') : ''}</span></button>`).join('') : '<p class="account-empty">No matching accounts.</p>';
}
function invalidateReview() { editorRevision++; $('consent').checked = false; }
function renderMedia() {
  $('upload-thumb').innerHTML = media ? (media.kind === 'image' ? `<img src="${escape(media.url)}" alt="Uploaded media thumbnail">` : uiIcon('video')) : uiIcon('image');
  $('upload-name').textContent = media?.name ?? 'Add an image or video'; $('upload-detail').textContent = media?.details ?? 'Choose a file to preview it on your channels';
  $('remove-media').hidden = !media;
}
function preview() {
  const text = escape($('caption').value || 'Your story starts here…');
  const title = escape($('title').value || 'Your video title');
  const ratio = ['reel', 'story'].includes($('placement').value) || activePreview === 'tiktok' ? 'vertical' : $('ratio').value;
  const asset = media ? `<${media.kind === 'video' ? 'video controls playsinline' : 'img'} src="${escape(media.url)}" ${media.kind === 'video' ? '' : 'alt="Post media preview"'}>${media.kind === 'video' ? '</video>' : ''}` : '<div class="preview-placeholder">Add media to preview your post</div>';
  const image = `<div class="preview-media ${ratio}">${asset}</div>`;
  const header = `<div class="post-header"><span class="avatar">${uiIcon('accounts')}</span><div><strong>${escape(displayName(activePreview))}</strong><small>${'Post preview'}</small></div><span class="post-more">${uiIcon('more')}</span></div>`;
  let card;
  if (activePreview === 'tiktok' || (activePreview === 'instagram' && ['reel', 'story'].includes($('placement').value))) {
    card = `<div class="video-preview">${image}<div class="video-side"><span>${uiIcon('heart')}</span><span>${uiIcon('comment')}</span><span>${uiIcon('share')}</span></div><div class="video-overlay"><strong>${escape(displayName(activePreview))}</strong><p>${text}</p><small>Original audio</small></div></div>`;
  } else if (activePreview === 'instagram') {
    card = `${header}${image}<div class="post-actions instagram-actions"><span>${uiIcon('heart')}</span><span>${uiIcon('comment')}</span><span>${uiIcon('share')}</span><span>${uiIcon('bookmark')}</span></div><p class="post-caption instagram-caption"><strong>${escape(displayName(activePreview))}</strong> ${text}</p>`;
  } else if (activePreview === 'youtube') {
    card = `${image}<div class="youtube-title">${title}</div>${header}<p class="post-caption">${text}</p>`;
  } else {
    card = `${header}<p class="post-caption">${text}</p>${media ? image : ''}<div class="post-engagement"><span>${activePreview === 'x' ? 'No engagement yet' : 'Be the first to react'}</span><span>Preview</span></div><div class="post-actions">${activePreview === 'x' ? `<span>${uiIcon('comment')} Reply</span><span>${uiIcon('repeat')} Repost</span><span>${uiIcon('heart')} Like</span>` : `<span>${uiIcon('thumb')} Like</span><span>${uiIcon('comment')} Comment</span><span>${uiIcon('share')} Share</span>`}</div>`;
  }
  $('post-preview').setAttribute('role', 'tabpanel');
  $('post-preview').setAttribute('aria-labelledby', `preview-${activePreview}`);
  $('post-preview').innerHTML = `<article class="preview-card" aria-label="${channels.find(c => c.id === activePreview).name} post preview">${card}</article>`;
  $('char-count').textContent = `${$('caption').value.length} characters`;
  renderWarnings();
}
function renderWarnings() {
  const warnings = [];
  if (selected.some(id => ['instagram', 'youtube', 'tiktok'].includes(id)) && !media) warnings.push('Instagram, YouTube and TikTok need media.');
  if (selected.includes('youtube') && media?.kind !== 'video') warnings.push('YouTube needs a video. An image is only a layout preview.');
  if (['reel', 'video'].includes($('placement').value) && media?.kind !== 'video') warnings.push('Select a video for this format.');
  $('validation').textContent = warnings.join(' ');
}
function view(name) {
  if (!availableViews.includes(name)) return;
  root.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `${name}-view`; });
  root.querySelectorAll('[data-view]').forEach(el => { const active = el.dataset.view === name; el.classList.toggle('active', active); el.setAttribute('aria-selected', String(active)); el.tabIndex = active ? 0 : -1; });
  const copy = { compose: ['Create a post', 'Shape your idea. See how it lands on every channel.'], calendar: ['Content calendar', 'A clear view of what is planned, drafted and shared.'], library: ['All posts', 'Your ideas and scheduled content, in one place.'], accounts: ['Connected accounts', 'Preview the channels your content can reach.'] }[name];
  $('page-title').textContent = copy[0]; $('page-subtitle').textContent = copy[1];
  if (name === 'calendar') renderCalendar(); if (name === 'library') renderLibrary(); if (name === 'accounts') renderAccounts();
}
function releaseMedia() { if (media?.url.startsWith('blob:')) URL.revokeObjectURL(media.url); }
function loadPost(post) {
  editorRevision++; uploadRevision++;
  selectedAccounts = new Set(configuredAccounts.filter(account => { const ids = post?.accountIds?.[account.platform]; return post ? ids === undefined ? post.channels.includes(account.platform) : Array.isArray(ids) ? ids.includes(account.id) : ids === account.id : true; }).map(accountKey));
  chooserPlatform = null; $('account-search').value = ''; renderAccountChooser();
  releaseMedia(); editingId = post?.id ?? null; selected = post ? [...post.channels] : demo ? ['facebook', 'instagram', 'linkedin'] : configuredAccounts.map(a => a.platform);
  activePreview = selected.find(platform => channels.some(channel => channel.id === platform)) ?? (channels.some(channel => channel.id === 'instagram') ? 'instagram' : channels[0].id); media = post?.media ?? null;
  $('title').value = post?.title ?? ''; $('caption').value = post?.text ?? ''; $('placement').value = post?.placement ?? 'feed'; $('ratio').value = post?.ratio ?? 'square';
  $('schedule').value = post?.schedule ?? ''; $('privacy').value = post?.privacy ?? 'private'; $('consent').checked = false; $('post-options').open = false;
  $('editor-status').className = `status ${post?.status ?? 'draft'}`; $('editor-status').textContent = post?.status === 'published' && demo ? 'Published demo' : post?.status ?? 'Draft';
  renderChannels(); renderMedia(); preview(); view('compose');
}
async function save(status) {
  const revision = editorRevision;
  if (!selected.length) return toast('Choose at least one channel.');
  if (!$('caption').value.trim() && !media) return toast('Add text or media before saving.');
  if (status !== 'draft' && !$('consent').checked) { $('post-options').open = true; $('consent').focus(); return toast('Review the post and check the approval box first.'); }
  if (status === 'scheduled' && (!$('schedule').value || new Date($('schedule').value) <= new Date())) { $('post-options').open = true; $('schedule').focus(); return toast('Choose a future date and time.'); }
  const item = { id: editingId ?? crypto.randomUUID(), title: $('title').value, text: $('caption').value, channels: [...selected], placement: $('placement').value, ratio: $('ratio').value, schedule: status === 'published' ? `${localDate(new Date())}T${new Date().toTimeString().slice(0, 5)}` : $('schedule').value, privacy: $('privacy').value, status,
    media: media && !media.url.startsWith('blob:') ? { ...media } : null };
  item.accountIds = Object.fromEntries(selected.map(platform => [platform, accountsFor(platform).filter(account => selectedAccounts.has(accountKey(account))).map(account => account.id)]));
  if (!demo) {
    if (selected.some(platform => !item.accountIds[platform]?.length)) return toast('Select connected accounts first.');
    const callback = status === 'published' ? options.onPublish : options.onSave;
    if (!callback) return toast('This action is not connected by the host application.');
    const buttons = ['save-draft', 'schedule-post', 'publish'].map($); buttons.forEach(button => { button.disabled = true; });
    try {
      const saved = await callback(structuredClone(item));
      if (destroyed) return;
      if (!saved || !saved.id || !Array.isArray(saved.channels) || !['draft', 'scheduled', 'processing', 'published', 'failed'].includes(saved.status)) throw Error();
      Object.assign(item, saved);
    } catch { return toast('Could not save this post. Check the connection and try again.'); }
    finally { buttons.forEach(button => { button.disabled = button.id === 'publish' ? !options.onPublish : !options.onSave; }); }
  }
  const old = posts.findIndex(p => p.id === item.id); if (old >= 0) posts[old] = item; else posts.push(item);
  persist(); updateCount();
  if (revision !== editorRevision) return;
  editingId = item.id;
  $('editor-status').className = `status ${item.status}`; $('editor-status').textContent = item.status === 'published' && demo ? 'Published demo' : item.status;
  if (!demo) toast('Post updated by your workspace.');
  else toast(status === 'published' ? 'Demo publish simulated. Nothing was sent to a platform.' : status === 'scheduled' ? 'Demo post scheduled in this browser only.' : 'Draft saved in this browser.');
  if (media?.url.startsWith('blob:')) toast('Post saved. Uploaded media is preview-only and must be reselected after reopening.');
  if (status === 'scheduled') { calendarMonth = new Date(new Date(item.schedule).getFullYear(), new Date(item.schedule).getMonth(), 1); view('calendar'); }
}
function updateCount() { $('post-count').textContent = posts.length; }
function renderCalendar() {
  $('month-title').textContent = calendarMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  const start = new Date(calendarMonth); start.setDate(1 - (start.getDay() + 6) % 7);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start); date.setDate(start.getDate() + i); const key = localDate(date);
    const events = posts.filter(p => p.schedule?.slice(0, 10) === key).sort((a, b) => a.schedule.localeCompare(b.schedule));
    cells.push(`<div class="calendar-cell ${date.getMonth() === calendarMonth.getMonth() ? '' : 'outside'}"><button class="date-button ${key === localDate(now) ? 'today' : ''}" data-date="${key}" aria-label="Create a post for ${key}">${date.getDate()}</button>${events.map(p => `<button class="calendar-event ${escape(p.status)}" data-edit="${escape(p.id)}"><small>${escape(p.schedule.slice(11, 16))} · ${p.status === 'published' && demo ? 'Published demo' : escape(p.status)}</small><strong>${escape(p.title || p.text)}</strong><small>${p.channels.map(id => escape(channels.find(c => c.id === id)?.name)).join(' / ')}</small></button>`).join('')}</div>`);
  }
  $('calendar-grid').innerHTML = cells.join('');
}
function renderLibrary() {
  const filter = $('status-filter').value; const list = posts.filter(p => filter === 'all' || p.status === filter);
  $('post-list').innerHTML = list.length ? list.map(p => `<article class="post-row">${p.media?.kind === 'image' ? `<img class="row-media" src="${escape(p.media.url)}" alt="Post thumbnail">` : '<div class="row-media"></div>'}<div class="row-content"><h3>${escape(p.title || p.text)}</h3><p>${p.channels.map(id => escape(channels.find(c => c.id === id)?.name)).join(' / ')}${p.schedule ? ` · ${escape(p.schedule.replace('T', ' '))}` : ' · No date'}</p></div><span class="status ${escape(p.status)}">${p.status === 'published' && demo ? 'Published demo' : escape(p.status)}</span><button class="icon-button" title="Edit post" aria-label="Edit post" data-edit="${escape(p.id)}">${uiIcon('edit')}</button><button class="icon-button" title="Delete post" data-delete="${escape(p.id)}" aria-label="Delete ${escape(p.title || 'post')}">${uiIcon('trash')}</button></article>`).join('') : `<div class="empty-state">${uiIcon('posts')}<p>No posts in this view.</p><button class="button secondary" data-create-post>Create a post</button></div>`;
}
const pendingAccountActions = new Set();
let connectionIntent = null;
let connectionBusy = false;
let dialogOpener = null;
function accountState(account) {
  return account.status === 'expired' || (account.expiresAt && Date.parse(account.expiresAt) <= Date.now()) ? 'expired' : account.status === 'error' ? 'error' : 'connected';
}
function reconcileSelection() {
  selectedAccounts = new Set([...selectedAccounts].filter(key => configuredAccounts.some(account => accountKey(account) === key && accountState(account) === 'connected')));
  invalidateReview(); renderChannels(); renderAccountChooser(); preview();
}
function upsertAccounts(result, platform) {
  const additions = Array.isArray(result) ? result : [result];
  if (!additions.length || additions.some(account => !account || account.platform !== platform || typeof account.id !== 'string' || !account.id || typeof account.name !== 'string' || (account.status !== undefined && !['connected', 'expired', 'error'].includes(account.status)))) throw Error('Invalid account metadata');
  for (const account of additions) {
    const safe = { platform:account.platform, id:account.id, name:account.name, status:account.status ?? 'connected', ...(account.expiresAt ? {expiresAt:account.expiresAt} : {}), ...(account.lastCheckedAt ? {lastCheckedAt:account.lastCheckedAt} : {}) };
    const index = configuredAccounts.findIndex(existing => accountKey(existing) === accountKey(safe));
    if (index >= 0) configuredAccounts[index] = safe; else configuredAccounts.push(safe);
  }
}
function renderAccounts() {
  $('open-connect').disabled = !demo && !options.onConnect;
  $('account-list').innerHTML = configuredAccounts.length ? configuredAccounts.map(account => {
    const key = accountKey(account); const state = accountState(account); const busy = pendingAccountActions.has(key);
    return `<article class="account-row">${icon(account.platform)}<div><strong>${escape(account.name)}</strong><small>${escape(channels.find(channel => channel.id === account.platform)?.name)} · ${demo ? 'Sample account' : escape(account.id)}${account.lastCheckedAt ? ' · Connection checked' : ''}</small></div><span class="status account-status account-state-${state}">${busy ? 'Working…' : state === 'expired' ? 'Reconnect required' : state === 'error' ? 'Connection error' : demo ? 'Connected · demo' : 'Connected'}</span><div class="account-actions"><button class="button secondary compact" data-check-account="${escape(key)}" ${busy || (!demo && !options.onCheckConnection) ? 'disabled' : ''}>${uiIcon('check')}Check connection</button><button class="button secondary compact" data-reconnect-account="${escape(key)}" ${busy || (!demo && !options.onReconnect) ? 'disabled' : ''}>${uiIcon('repeat')}Reconnect</button><button class="button secondary compact" data-disconnect-account="${escape(key)}" ${busy || (!demo && !options.onDisconnect) ? 'disabled' : ''}>${uiIcon('close')}Disconnect</button></div></article>`;
  }).join('') : `<div class="empty-state"><p>No accounts connected. Connect your first account to publish.</p><button class="button secondary" data-open-connect ${!demo && !options.onConnect ? 'disabled' : ''}>Connect account</button></div>`;
}
function openConnection(intent = { action:'connect' }) {
  if (connectionBusy) return;
  connectionIntent = intent; if (!$('connection-dialog').open) dialogOpener = root.activeElement;
  $('connection-error').textContent = '';
  const choosing = intent.action === 'connect' && !intent.platform;
  $('connection-title').textContent = intent.action === 'disconnect' ? 'Disconnect account?' : intent.action === 'reconnect' ? 'Reconnect account' : 'Connect an account';
  $('connection-platforms').hidden = !choosing;
  $('connection-review').hidden = choosing;
  $('connection-help').hidden = !choosing;
  $('connection-platforms').innerHTML = channels.map(channel => `<button data-connect="${channel.id}" ${!demo && (!options.onConnect || (options.connectablePlatforms && !options.connectablePlatforms.includes(channel.id))) ? 'disabled title="Not configured in this workspace"' : ''}>${icon(channel.id)}${channel.name}</button>`).join('');
  $('connection-continue').hidden = choosing;
  $('demo-identity').hidden = !demo || intent.action !== 'connect' || choosing;
  if (!choosing) {
    const channel = channels.find(channel => channel.id === intent.platform);
    $('connection-provider').innerHTML = `${icon(intent.platform)}<span>${escape(intent.account?.name ?? channel.name)}</span>`;
    $('connection-description').textContent = intent.action === 'disconnect' ? 'This account will stop being available for new posts. Existing posts are kept. You can connect it again later.' : demo ? 'Demo preview only: no sign-in page is opened and no real account is connected. Continue to simulate this flow.' : intent.action === 'reconnect' ? 'Sign in again to renew this account’s permissions. Your current connection stays until authorization succeeds.' : intent.platform === 'x' ? 'Continue to your workspace’s X connection flow. It uses your own developer application and billing.' : `Continue to ${channel.name} to sign in and authorize access. Select the accounts or pages you want to connect.`;
    $('connection-continue').textContent = intent.action === 'disconnect' ? 'Disconnect' : demo ? 'Simulate connection' : `Continue with ${channel.name}`;
    $('demo-account-name').value = `My ${channel.name} account`;
  }
  if (!$('connection-dialog').open) $('connection-dialog').showModal();
}
function closeConnection() {
  if (connectionBusy) return;
  $('connection-dialog').close(); connectionIntent = null;
  if (dialogOpener?.isConnected) dialogOpener.focus();
}
async function runConnection() {
  if (!connectionIntent || connectionBusy) return;
  const intent = connectionIntent; connectionBusy = true;
  $('connection-continue').disabled = true; $('connection-continue').textContent = intent.action === 'disconnect' ? 'Disconnecting…' : 'Waiting for authorization…';
  try {
    if (intent.action === 'disconnect') {
      if (!demo) await options.onDisconnect(structuredClone(intent.account));
      if (destroyed) return;
      const index = configuredAccounts.findIndex(account => accountKey(account) === accountKey(intent.account));
      if (index >= 0) configuredAccounts.splice(index, 1);
    } else {
      const result = demo ? { platform:intent.platform, id:intent.account?.id ?? `demo-${intent.platform}-${crypto.randomUUID()}`, name:intent.account?.name ?? ($('demo-account-name').value.trim() || 'Sample account'), status:'connected', lastCheckedAt:new Date().toISOString() } : await (intent.action === 'reconnect' ? options.onReconnect(structuredClone(intent.account)) : options.onConnect(intent.platform));
      if (destroyed) return;
      if (!result) { connectionBusy = false; closeConnection(); toast('Authorization cancelled. No accounts changed.'); return; }
      if (intent.action === 'reconnect' && (Array.isArray(result) || result.id !== intent.account.id || result.platform !== intent.platform)) throw Error('Reconnect target mismatch');
      upsertAccounts(result, intent.platform);
    }
    persist(); reconcileSelection(); renderAccounts(); connectionBusy = false; closeConnection();
    toast(intent.action === 'disconnect' ? 'Account disconnected.' : demo ? 'Demo connection updated. No real account was authorized.' : 'Account connected.');
  } catch {
    if (!destroyed) $('connection-error').textContent = intent.action === 'disconnect' ? 'Could not disconnect. Your account has been kept.' : 'Connection was not completed. Your existing accounts have been kept. Try again.';
  } finally {
    connectionBusy = false;
    if (!destroyed) { $('connection-continue').disabled = false; $('connection-continue').textContent = intent.action === 'disconnect' ? 'Disconnect' : demo ? 'Simulate connection' : 'Try again'; }
  }
}
async function checkConnection(account) {
  const key = accountKey(account); if (pendingAccountActions.has(key)) return;
  pendingAccountActions.add(key); renderAccounts();
  try {
    const result = demo ? { ...account, status:'connected', lastCheckedAt:new Date().toISOString() } : await options.onCheckConnection(structuredClone(account));
    if (destroyed) return;
    if (!result || result.id !== account.id || result.platform !== account.platform) throw Error('Check target mismatch');
    upsertAccounts(result, account.platform); persist(); reconcileSelection();
    toast(accountState(result) === 'connected' ? 'Connection checked.' : 'This account needs to be reconnected.');
  } catch { toast('Could not verify the connection. The account has been kept.'); }
  finally { pendingAccountActions.delete(key); if (!destroyed) renderAccounts(); }
}
listen($('open-connect'), 'click', () => openConnection());
listen($('connection-continue'), 'click', runConnection);
listen($('connection-cancel'), 'click', closeConnection);
listen($('close-connection'), 'click', closeConnection);
listen($('connection-dialog'), 'cancel', event => { event.preventDefault(); closeConnection(); });
listen($('account-search'), 'input', renderAccountChooser);
listen($('close-account-chooser'), 'click', () => { chooserPlatform = null; renderAccountChooser(); });
for (const [id, add] of [['select-all-accounts', true], ['clear-accounts', false]]) listen($(id), 'click', () => {
  for (const account of accountsFor(chooserPlatform)) { if (add && accountState(account) === 'connected') selectedAccounts.add(accountKey(account)); else selectedAccounts.delete(accountKey(account)); }
  invalidateReview(); renderAccountChooser(); renderChannels(); preview();
});
listen(root, 'click', async event => {
  const el = event.target.closest('button'); if (!el) return;
  if (el.dataset.view) view(el.dataset.view);
  if (el.dataset.connect) openConnection({action:'connect',platform:el.dataset.connect});
  if (el.hasAttribute('data-open-connect')) openConnection();
  for (const [attribute, action] of [['checkAccount','check'],['reconnectAccount','reconnect'],['disconnectAccount','disconnect']]) {
    if (el.dataset[attribute]) {
      const account = configuredAccounts.find(account => accountKey(account) === el.dataset[attribute]);
      if (account) { if (action === 'check') await checkConnection(account); else openConnection({action,platform:account.platform,account}); }
    }
  }
  if (el.hasAttribute('data-create-post')) loadPost();
  if (el.dataset.channel) {
    const id = el.dataset.channel;
    chooserPlatform = id; $('account-search').value = ''; renderAccountChooser(); $('account-search').focus();
    activePreview = id; renderChannels(); preview();
  }
  if (el.dataset.accountKey) {
    const key = el.dataset.accountKey;
    if (selectedAccounts.has(key)) selectedAccounts.delete(key); else selectedAccounts.add(key);
    invalidateReview(); renderAccountChooser(); renderChannels(); preview();
  }
  if (el.dataset.preview) { activePreview = el.dataset.preview; renderChannels(); preview(); }
  if (el.dataset.edit) { const post = posts.find(p => p.id === el.dataset.edit); if (post) loadPost(post); }
  if (el.dataset.delete) {
    const removed = posts.find(post => post.id === el.dataset.delete);
    if (!demo) {
      if (!options.onDelete) return toast('Deletion is not connected by the host application.');
      try { await options.onDelete(el.dataset.delete); } catch { return toast('Could not delete this post.'); }
      if (destroyed) return;
    }
    deletedPost = removed; posts = posts.filter(post => post.id !== el.dataset.delete);
    persist(); updateCount(); renderLibrary();
    toast(demo ? 'Demo post deleted.' : 'Post deleted.', demo || Boolean(options.onRestore));
  }
  if (el.dataset.date) { loadPost(); $('schedule').value = `${el.dataset.date}T10:00`; }
});
for (const id of ['caption', 'title']) listen($(id), 'input', () => { invalidateReview(); preview(); });
for (const id of ['placement', 'ratio']) listen($(id), 'change', () => { invalidateReview(); preview(); });
for (const id of ['privacy', 'schedule']) listen($(id), 'change', invalidateReview);
listen($('status-filter'), 'change', renderLibrary);
listen($('new-post'), 'click', () => loadPost());
listen($('save-draft'), 'click', () => save('draft'));
listen($('schedule-post'), 'click', () => save('scheduled'));
listen($('publish'), 'click', () => save('published'));
listen($('remove-media'), 'click', () => { uploadRevision++; invalidateReview(); releaseMedia(); media = null; $('media-file').value = ''; renderMedia(); preview(); });
async function handleFile(file) {
  if (!file) return;
  const revision = ++uploadRevision;
  invalidateReview();
  if (!/^(image|video)\//.test(file.type)) return toast('Choose an image or video.');
  if (!demo) {
    if (!options.onUpload) return toast('Media upload is not connected by the host application.');
    try {
      const uploaded = await options.onUpload(file);
      if (destroyed || revision !== uploadRevision) return;
      const url = new URL(uploaded?.url);
      if (!['https:', 'http:'].includes(url.protocol) || !['image', 'video'].includes(uploaded.kind)) throw Error();
      releaseMedia(); media = { ...uploaded }; renderMedia(); preview();
    } catch { toast('Could not upload this file.'); }
    return;
  }
  releaseMedia(); media = { url: URL.createObjectURL(file), kind: file.type.startsWith('video') ? 'video' : 'image', name: file.name, details: `${(file.size / 1024 / 1024).toFixed(1)} MB · Local preview only` };
  if (media.kind === 'image') { const image = new Image(); const current = media; image.onload = () => { if (media !== current) return; media.details = `${image.naturalWidth} × ${image.naturalHeight} · Local preview only`; renderMedia(); }; image.src = media.url; }
  renderMedia(); preview();
}
listen($('media-file'), 'change', () => handleFile($('media-file').files[0]));
const uploadArea = root.querySelector('.upload-area');
uploadArea.tabIndex = 0;
uploadArea.setAttribute('role', 'button');
uploadArea.setAttribute('aria-label', 'Add image or video');
listen(uploadArea, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('media-file').click(); } });
listen(uploadArea, 'dragover', event => { event.preventDefault(); uploadArea.classList.add('drag-over'); });
listen(uploadArea, 'dragleave', () => uploadArea.classList.remove('drag-over'));
listen(uploadArea, 'drop', event => { event.preventDefault(); uploadArea.classList.remove('drag-over'); handleFile(event.dataTransfer.files[0]); });
listen($('prev-month'), 'click', () => { calendarMonth.setMonth(calendarMonth.getMonth() - 1); renderCalendar(); });
listen($('next-month'), 'click', () => { calendarMonth.setMonth(calendarMonth.getMonth() + 1); renderCalendar(); });
listen($('today'), 'click', () => { calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1); renderCalendar(); });
listen($('reset'), 'click', () => { deletedPost = null; $('status-filter').value = 'all'; if (demo) configuredAccounts.splice(0, configuredAccounts.length, ...channels.map(channel => ({platform:channel.id,id:`demo-${channel.id}-1`,name:'Sample studio'}))); posts = seed(); persist(); updateCount(); loadPost(posts[0]); toast('Sample content restored.'); });
listen($('more-menu'), 'click', () => {
  $('studio-menu').hidden = !$('studio-menu').hidden;
  $('more-menu').setAttribute('aria-expanded', String(!$('studio-menu').hidden));
  if (!$('studio-menu').hidden) $('reset').focus();
});
async function undoDelete() {
  if (!deletedPost) return;
  let restored = deletedPost;
  if (!demo) { if (!options.onRestore) return; try { restored = await options.onRestore(structuredClone(restored)); } catch { return toast('Could not restore this post.'); } }
  if (destroyed) return;
  posts.push(restored); deletedPost = null; persist(); updateCount(); renderLibrary(); renderCalendar(); toast('Post restored.');
}
listen($('undo-delete'), 'click', undoDelete);
listen(root, 'keydown', event => {
  const tab = event.target.closest('[role=tab]');
  if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    const list = [...tab.parentElement.querySelectorAll('[role=tab]')];
    let index = list.indexOf(tab);
    index = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    event.preventDefault(); const next = list[index]; next.click();
    const selector = next.dataset.preview ? `[data-preview="${next.dataset.preview}"]` : `[data-view="${next.dataset.view}"]`;
    root.querySelector(selector).focus();
  }
  if (availableViews.includes('compose') && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); loadPost(); $('caption').focus(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.target.matches('input,textarea,[contenteditable]')) { event.preventDefault(); undoDelete(); }
  if (event.key === 'Escape') { $('studio-menu').hidden = true; $('more-menu').setAttribute('aria-expanded', 'false'); }
});
listen($('reset'), 'click', () => { $('studio-menu').hidden = true; $('more-menu').setAttribute('aria-expanded', 'false'); });
if (!demo) {
  $('save-draft').disabled = !options.onSave;
  $('schedule-post').disabled = !options.onSave;
  $('publish').disabled = !options.onPublish;
  $('reset').hidden = true; $('more-menu').hidden = true;
  root.querySelector('.account-notice').textContent = 'Accounts are provided by your workspace. Credentials stay on your server.';
  $('publish').textContent = 'Publish';
  root.querySelector('#status-filter option[value=published]').textContent = 'Published';
  root.querySelector('.legend span:nth-child(2)').lastChild.textContent = 'Published';
}
loadPost(posts[0]); updateCount();
view(options.initialView && availableViews.includes(options.initialView) ? options.initialView : availableViews[0]);
return {
  setTheme,
  setAccounts(next) {
    if (destroyed) return;
    if (new Set(next.map(accountKey)).size !== next.length) throw new Error('Duplicate platform account');
    configuredAccounts.splice(0, configuredAccounts.length, ...structuredClone(next));
    selectedAccounts = new Set([...selectedAccounts].filter(key => configuredAccounts.some(account => accountKey(account) === key)));
    invalidateReview(); renderChannels(); renderAccountChooser(); renderAccounts(); preview();
  },
  setPosts(next) { if (destroyed) return; posts = structuredClone(next); updateCount(); renderCalendar(); renderLibrary(); },
  destroy() { destroyed = true; listeners.abort(); clearTimeout(toastTimer); releaseMedia(); media = null; root.replaceChildren(); },
};
}


/** Mount only account connection management inside an existing application's shell. */
export function mountSocialAccounts(host, options) {
  return mountSocialStudio(host, { ...options, views:['accounts'], initialView:'accounts' });
}
