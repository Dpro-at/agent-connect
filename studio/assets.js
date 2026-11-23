export const template = `<div class="studio-shell" data-theme="light">
<header class="studio-toolbar">
<div class="module-title"><span data-ui="posts"></span><h1>Social publishing</h1></div>
<div class="toolbar-actions"><button id="new-post" class="button secondary"><span data-ui="plus"></span>New post</button><button id="more-menu" class="icon-button" aria-label="More options" title="More options" aria-expanded="false" aria-controls="studio-menu"><span data-ui="more"></span></button><div id="studio-menu" class="toolbar-menu" hidden><button id="reset">Reset sample content</button></div></div>
</header>
<nav class="studio-tabs" role="tablist" aria-label="Publishing views"><button id="tab-compose" data-view="compose" role="tab" aria-controls="compose-view" aria-selected="true" tabindex="0" class="active"><span data-ui="edit"></span>Editor</button><button id="tab-calendar" data-view="calendar" role="tab" aria-controls="calendar-view" aria-selected="false" tabindex="-1"><span data-ui="calendar"></span>Calendar</button><button id="tab-library" data-view="library" role="tab" aria-controls="library-view" aria-selected="false" tabindex="-1"><span data-ui="posts"></span>Posts <span id="post-count" class="tab-count"></span></button><button id="tab-accounts" data-view="accounts" role="tab" aria-controls="accounts-view" aria-selected="false" tabindex="-1"><span data-ui="accounts"></span>Accounts</button></nav>
<main class="content"><div class="sr-only"><h2 id="page-title">Create a post</h2><p id="page-subtitle"></p></div>
<section id="compose-view" class="view" role="tabpanel" aria-labelledby="tab-compose" tabindex="0">
<div class="compose-grid">
<section class="editor panel">
<div class="panel-head">
<h2>Compose</h2>
<span id="editor-status" class="status draft">Draft</span>
</div>
<div class="editor-body">
<label class="field-label">Publish to <span id="selection-summary">Select accounts</span>
</label>
<div id="channel-picker" class="channel-picker"></div>
<section id="account-chooser" class="account-chooser" hidden aria-label="Choose publishing accounts"><div class="chooser-heading"><h3 id="account-chooser-title">Accounts</h3><button id="close-account-chooser" class="icon-button" aria-label="Close account picker" title="Close account picker"><span data-ui="close"></span></button></div><input id="account-search" type="search" placeholder="Search account name or ID" aria-label="Search accounts"><div class="chooser-actions"><button id="select-all-accounts" class="text-button">Select all</button><button id="clear-accounts" class="text-button">Clear selection</button></div><div id="account-choices" class="account-choices"></div></section>
<div class="label-row">
<label for="caption">What would you like to share?</label>
<span id="char-count">0 characters</span>
</div>
<textarea id="caption" rows="6" placeholder="Start with an idea…">
</textarea>
<div class="media-label">
<label>Media</label>
<button id="remove-media" class="icon-button" aria-label="Remove media" title="Remove media"><span data-ui="trash"></span></button>
</div>
<label class="upload-area" for="media-file">
<span id="upload-thumb">
</span>
<span>
<strong id="upload-name">Add an image or video</strong>
<small id="upload-detail">Choose a file to preview it on your channels</small>
</span>
<span class="upload-plus" data-ui="upload"></span>
</label>
<input type="file" id="media-file" accept="image/*,video/*" class="sr-only">
<p class="helper">Preview crop changes the display only. It does not resize or export your file.</p>
<details id="post-options" class="post-options"><summary>Post options</summary><div class="field-row">
<div>
<label for="placement">Format</label>
<select id="placement">
<option value="feed">Feed post</option>
<option value="reel">Reel</option>
<option value="story">Story</option>
<option value="video">Video / Short</option>
</select>
</div>
<div>
<label for="ratio">Preview crop</label>
<select id="ratio">
<option value="square">Square · 1:1</option>
<option value="portrait">Portrait · 4:5</option>
<option value="vertical">Vertical · 9:16</option>
<option value="landscape">Landscape · 16:9</option>
</select>
</div>
</div>
<label for="title">Title <span class="muted">YouTube / TikTok photos</span>
</label>
<input id="title" maxlength="100" placeholder="Give your post a title">
<div class="field-row">
<div>
<label for="schedule">Date and time <span class="muted">Local time</span>
</label>
<input type="datetime-local" id="schedule">
</div>
<div>
<label for="privacy">Visibility</label>
<select id="privacy">
<option value="private">Private / only me</option>
<option value="public">Public</option>
<option value="unlisted">Unlisted (YouTube)</option>
</select>
</div>
</div>
<label class="check-row">
<input type="checkbox" id="consent">
<span>I reviewed this post and the selected accounts.</span>
</label>
</details>
<div id="validation" role="status">
</div>
</div>
<footer class="editor-footer">
<button id="save-draft" class="button secondary">Save draft</button>
<div>
<button id="publish" class="button secondary">Simulate publish</button>
<button id="schedule-post" class="button primary">Schedule post</button>
</div>
</footer>
</section>
<section class="preview-column">
<div class="preview-heading">
<h2>Live preview</h2>
</div>
<div id="preview-tabs" class="preview-tabs" role="tablist" aria-label="Preview platform">
</div>
<div id="post-preview">
</div>
<div class="preview-note">
<span data-ui="info"></span>
<p>Layout preview. Cropping and appearance can vary by platform.</p>
</div>
</section>
</div>
</section>
<section id="calendar-view" class="view" role="tabpanel" aria-labelledby="tab-calendar" tabindex="0" hidden>
<div class="calendar-toolbar">
<div class="month-picker">
<button id="prev-month" class="icon-button" aria-label="Previous month"><span data-ui="chevronLeft"></span></button>
<h2 id="month-title">
</h2>
<button id="next-month" class="icon-button" aria-label="Next month"><span data-ui="chevronRight"></span></button>
<button id="today" class="button secondary compact">This month</button>
</div>
<div class="legend">
<span>
<i class="scheduled-dot">
</i>Scheduled</span>
<span>
<i class="published-dot">
</i>Published demo</span>
<span>
<i class="draft-dot">
</i>Draft</span>
</div>
</div>
<div class="calendar-scroll">
<div class="weekday-row">
<span>Mon</span>
<span>Tue</span>
<span>Wed</span>
<span>Thu</span>
<span>Fri</span>
<span>Sat</span>
<span>Sun</span>
</div>
<div id="calendar-grid" class="calendar-grid">
</div>
</div>
</section>
<section id="library-view" class="view" role="tabpanel" aria-labelledby="tab-library" tabindex="0" hidden>
<div class="list-toolbar">
<h2>Content library</h2>
<select id="status-filter" aria-label="Filter posts by status">
<option value="all">All statuses</option>
<option value="draft">Drafts</option>
<option value="scheduled">Scheduled</option>
<option value="published">Published demo</option><option value="processing">Processing</option><option value="failed">Failed</option>
</select>
</div>
<div id="post-list">
</div>
</section>
<section id="accounts-view" class="view" role="tabpanel" aria-labelledby="tab-accounts" tabindex="0" hidden>
<div class="account-notice">These are sample accounts for previewing content. No credentials are collected or saved.</div>
<div class="accounts-toolbar"><h2>Connected accounts</h2><button id="open-connect" class="button primary"><span data-ui="plus"></span>Connect account</button></div>
<div id="account-list">
</div>
</section>

</main>
<dialog id="connection-dialog" class="connection-dialog" aria-labelledby="connection-title"><header class="dialog-heading"><h2 id="connection-title">Connect an account</h2><button id="close-connection" class="icon-button" aria-label="Close connection dialog" title="Close"><span data-ui="close"></span></button></header><div class="dialog-content"><p id="connection-help">Choose a platform. Sign in and select the accounts or pages to authorize.</p><div id="connection-platforms" class="connection-platforms"></div><div id="connection-review" hidden><div id="connection-provider"></div><p id="connection-description"></p><div id="demo-identity" hidden><label for="demo-account-name">Sample account name</label><input id="demo-account-name" placeholder="My studio account"></div><div id="connection-error" role="alert"></div></div></div><footer class="dialog-footer"><button id="connection-cancel" class="button secondary">Cancel</button><button id="connection-continue" class="button primary" hidden>Continue</button></footer></dialog>
<div id="toast" role="status" aria-live="polite"><span id="toast-text"></span><button id="undo-delete" hidden>Undo</button></div></div>`;

export const styles = `
.accounts-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
.connection-dialog { width:min(510px,calc(100% - 24px)); padding:0; background:var(--surface); color:var(--text); border:1px solid var(--control); border-radius:6px; max-height:85dvh; overflow:auto; }
.connection-dialog::backdrop { background:rgb(0 0 0 / 28%); }
.dialog-heading { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--line); }
.dialog-content { padding:18px; }
.dialog-content p { font-size:12px; color:var(--muted); line-height:1.7; margin-bottom:16px; }
.connection-platforms { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.connection-platforms button { display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--line); border-radius:4px; color:var(--text); background:var(--surface); text-align:start; }
.connection-platforms button:hover { border-color:var(--accent); background:var(--subtle); }
.dialog-footer { display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--line); padding:12px 18px; }
#connection-provider { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:500; margin-bottom:14px; }
#connection-provider .platform-icon { width:30px; height:30px; }
#connection-error { color:var(--danger); font-size:12px; margin-top:12px; }
.account-actions { display:flex; flex:none; gap:6px; align-items:center; }
.account-actions .ui-icon { width:15px; height:15px; }
.account-status { margin-inline-end:12px; }
.account-state-expired { color:var(--warning); }.account-state-error { color:var(--danger); }.account-state-connected { color:var(--success); }
@container(max-width:650px) { .account-row { flex-wrap:wrap; }.account-actions { width:100%; justify-content:flex-end; }.account-status { margin-inline-start:auto; margin-inline-end:0; } }

.connect-platforms { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
.connect-platforms .platform-icon { width:18px; height:18px; }
.account-count { font-size:10px; color:var(--muted); }
.account-chooser { border:1px solid var(--line); padding:12px; border-radius:4px; margin-bottom:18px; background:var(--canvas); }
.chooser-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.chooser-heading h3 { font-size:12px; font-weight:500; }
.chooser-actions { display:flex; justify-content:flex-end; gap:6px; margin:6px 0; }
.account-choices { max-height:230px; overflow:auto; }
.account-choice { width:100%; background:var(--surface); color:var(--text); border:1px solid var(--line); border-radius:3px; display:flex; text-align:start; align-items:center; padding:9px; margin-bottom:5px; gap:10px; }
.account-choice[aria-checked=true] { border-color:var(--accent); }
.account-choice strong,.account-choice small { display:block; }
.account-choice strong { font-size:12px; font-weight:500; }
.account-choice small { font-size:11px; color:var(--muted); }
.choice-check { margin-inline-start:auto; width:18px; height:18px; color:var(--accent); border:1px solid var(--control); border-radius:3px; }
.choice-check .ui-icon { width:16px; height:16px; }
.account-empty { padding:15px; color:var(--muted); font-size:12px; }

:host { display:block; min-width:0; color:var(--studio-text,#252528); font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; font-synthesis:none; }
* { box-sizing:border-box; }
.studio-shell { --canvas:var(--studio-canvas,#f8f9fe); --surface:var(--studio-surface,#fdfdfd); --subtle:var(--studio-subtle,#e1e7f7); --text:var(--studio-text,#252528); --muted:var(--studio-muted,#525255); --line:var(--studio-border,#d5dff4); --control:var(--studio-control,#747d90); --accent:var(--studio-accent,#0053fd); --on-accent:var(--studio-on-accent,#fcfcfc); --danger:#bc254b; --success:#176f50; --warning:#885a16; background:var(--canvas); color:var(--text); border:1px solid var(--line); border-radius:6px; overflow:clip; container-type:inline-size; position:relative; }
.studio-shell[data-theme=dark] { --canvas:var(--studio-canvas,#0d1015); --surface:var(--studio-surface,#0e0f12); --subtle:var(--studio-subtle,#1c2332); --text:var(--studio-text,#d9e0e6); --muted:var(--studio-muted,#aeb4b9); --line:var(--studio-border,#1d2636); --control:var(--studio-control,#8a95aa); --accent:var(--studio-accent,#4a84fe); --on-accent:var(--studio-on-accent,#161616); --danger:#e75e78; --success:#55a583; --warning:#c08532; color-scheme:dark; }
@media(prefers-color-scheme:dark) { .studio-shell[data-theme=system] { --canvas:var(--studio-canvas,#0d1015); --surface:var(--studio-surface,#0e0f12); --subtle:var(--studio-subtle,#1c2332); --text:var(--studio-text,#d9e0e6); --muted:var(--studio-muted,#aeb4b9); --line:var(--studio-border,#1d2636); --control:var(--studio-control,#8a95aa); --accent:var(--studio-accent,#4a84fe); --on-accent:var(--studio-on-accent,#161616); --danger:#e75e78; --success:#55a583; --warning:#c08532; color-scheme:dark; } }
button,input,textarea,select { font:inherit; }
button { cursor:pointer; }
button:disabled { cursor:default; background:var(--subtle)!important; color:var(--muted)!important; }
button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible,[tabindex]:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
[hidden] { display:none!important; }
.ui-icon { width:18px; height:18px; flex:none; vertical-align:middle; }
[data-ui] { display:inline-flex; align-items:center; }
.studio-toolbar { min-height:56px; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 20px; background:var(--surface); border-bottom:1px solid var(--line); }
.module-title,.toolbar-actions { display:flex; align-items:center; gap:12px; min-width:0; }
.module-title>span:first-child { color:var(--accent); }
h1,h2,h3,p { margin:0; }
h1 { font-size:15px; font-weight:600; white-space:nowrap; }
h2 { font-size:13px; font-weight:600; }
.local-pill { color:var(--muted); font-size:11px; padding:2px 7px; border:1px solid var(--line); border-radius:4px; }
#workspace-name { color:var(--muted); font-size:12px; margin-inline-end:4px; }
.toolbar-actions { position:relative; gap:6px; }
.button,.icon-button,.text-button { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:4px; font-size:12px; font-weight:500; min-height:32px; padding:6px 12px; border:1px solid var(--line); background:var(--surface); color:var(--text); white-space:nowrap; }
.button.primary { background:var(--accent); color:var(--on-accent); border-color:var(--accent); }
.button.primary:hover:not(:disabled) { filter:brightness(1.08); }
.button.secondary:hover:not(:disabled),.icon-button:hover:not(:disabled),.text-button:hover:not(:disabled) { background:var(--subtle); }
.icon-button { width:32px; padding:6px; flex:none; }
.text-button { border:0; color:var(--muted); background:none; padding:4px 7px; }
.button.compact { min-height:28px; padding:4px 10px; }
.toolbar-menu { position:absolute; right:0; top:calc(100% + 6px); z-index:10; padding:4px; border:1px solid var(--control); border-radius:5px; background:var(--surface); box-shadow:0 8px 24px #0002; min-width:180px; }
.toolbar-menu button { border:0; background:none; width:100%; color:var(--text); text-align:start; padding:9px; font-size:12px; border-radius:3px; }
.toolbar-menu button:hover { background:var(--subtle); }
.studio-tabs { display:flex; align-items:stretch; padding:0 20px; gap:24px; background:var(--surface); border-bottom:1px solid var(--line); }
.studio-tabs>button { display:flex; gap:7px; align-items:center; min-height:45px; border:0; border-bottom:2px solid transparent; color:var(--muted); background:none; padding:8px 1px; font-size:12px; white-space:nowrap; }
.studio-tabs>button.active { border-bottom-color:var(--accent); color:var(--accent); }
.studio-tabs>button:hover { color:var(--accent); }
.tab-count { font-size:10px; background:var(--subtle); color:var(--muted); border-radius:3px; padding:0 5px; }
.content { padding:24px; min-height:520px; }
.compose-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,420px); gap:24px; align-items:start; max-width:1320px; margin:auto; }
.panel { background:var(--surface); border:1px solid var(--line); border-radius:5px; min-width:0; }
.panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 18px; border-bottom:1px solid var(--line); }
.status { display:inline-flex; align-items:center; gap:5px; font-size:11px; line-height:18px; color:var(--muted); white-space:nowrap; }
.status:before { content:""; width:5px; height:5px; border-radius:50%; background:currentColor; }
.status.scheduled,.status.processing { color:var(--accent); }
.status.published { color:var(--success); }
.status.failed { color:var(--danger); }
.editor-body { padding:18px; }
label,.field-label { display:block; font-size:12px; font-weight:500; margin-bottom:7px; }
.field-label { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.field-label span,.muted { color:var(--muted); font-weight:400; font-size:11px; }
.channel-picker { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:22px; }
.channel { display:inline-flex; gap:7px; align-items:center; border:1px solid var(--line); background:var(--surface); color:var(--muted); padding:7px 9px; border-radius:4px; font-size:12px; min-height:35px; }
.channel.selected { border-color:var(--accent); color:var(--text); background:color-mix(in srgb,var(--accent) 5%,var(--surface)); }
.channel-check { display:flex; color:var(--accent); margin-inline-start:2px; }
.channel-check .ui-icon { width:13px; height:13px; }
.platform-icon { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; flex:none; }
.platform-icon img { width:100%; height:100%; object-fit:contain; }
.platform-icon.x,.platform-icon.linkedin,.platform-icon.tiktok { border-radius:3px; padding:2px; background:#fff; }
input:not([type=checkbox],[type=file]),textarea,select { width:100%; min-width:0; padding:8px 10px; border:1px solid var(--control); border-radius:4px; background:var(--surface); color:var(--text); font-size:12px; min-height:34px; }
textarea { font-size:13px; min-height:168px; line-height:1.7; resize:vertical; }
input::placeholder,textarea::placeholder { color:var(--muted); }
.label-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
#char-count { color:var(--muted); font-size:11px; }
.media-label { display:flex; align-items:center; justify-content:space-between; margin:16px 0 6px; }
.media-label label { margin:0; }
#remove-media { width:28px; min-height:28px; border:0; color:var(--muted); }
.upload-area { display:flex; align-items:center; gap:12px; border:1px dashed var(--control); border-radius:4px; padding:12px; cursor:pointer; background:var(--canvas); }
.upload-area.drag-over { border-color:var(--accent); background:var(--subtle); outline:2px solid var(--accent); }
.upload-area strong { font-size:12px; font-weight:500; display:block; word-break:break-word; }
.upload-area small { color:var(--muted); display:block; font-size:11px; margin-top:4px; }
#upload-thumb { width:42px; height:42px; display:grid; place-items:center; background:var(--subtle); color:var(--muted); border-radius:3px; flex:none; overflow:hidden; }
#upload-thumb img { width:100%; height:100%; object-fit:cover; }
.upload-plus { margin-inline-start:auto; color:var(--muted); }
.helper { color:var(--muted); font-size:11px; line-height:1.6; margin:7px 0 16px; }
.post-options { border-top:1px solid var(--line); margin-top:18px; padding-top:12px; }
.post-options summary { cursor:pointer; font-size:12px; font-weight:500; padding:2px 0; }
.post-options[open] summary { margin-bottom:16px; }
.field-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px; }
.field-row>div { min-width:0; }
#title { margin-bottom:16px; }
.check-row { display:flex; gap:8px; align-items:start; font-weight:400; color:var(--muted); line-height:1.6; margin:0; }
.check-row input { accent-color:var(--accent); flex:none; margin:3px 0 0; }
#validation { margin-top:12px; color:var(--warning); font-size:12px; line-height:1.6; }
#validation:empty { display:none; }
.editor-footer { display:flex; justify-content:space-between; gap:8px; padding:12px 18px; border-top:1px solid var(--line); background:var(--canvas); border-radius:0 0 5px 5px; }
.editor-footer>div { display:flex; gap:7px; }
.preview-column { background:var(--surface); border:1px solid var(--line); border-radius:5px; min-width:0; padding:16px; }
.preview-heading { display:flex; justify-content:space-between; gap:6px; align-items:center; }
.preview-heading>span { font-size:11px; color:var(--muted); }
.preview-tabs { display:flex; gap:6px; margin:15px 0 18px; }
.preview-tab { display:flex; align-items:center; justify-content:center; background:var(--surface); border:1px solid var(--line); border-radius:4px; padding:6px 9px; min-height:34px; }
.preview-tab:hover { background:var(--subtle); }
.preview-tab[aria-selected=true] { border-color:var(--accent); box-shadow:inset 0 -2px var(--accent); }
.preview-tab .platform-icon { width:18px; height:18px; }
.preview-card { color:#252528; background:#fff; border:1px solid #d8dde6; border-radius:7px; overflow:hidden; max-width:390px; margin:auto; }
.post-header { display:flex; align-items:center; gap:9px; padding:14px; }
.avatar { width:34px; height:34px; flex:none; border-radius:50%; display:inline-grid; place-items:center; font-weight:600; background:#e1e7f7; color:#365688; }
.post-header strong { display:block; font-size:12px; }
.post-header small { display:block; color:#5f6674; font-size:11px; margin-top:2px; }
.post-more { margin-inline-start:auto; color:#69717e; display:flex; }
.post-caption { padding:0 14px 14px; font-size:12px; line-height:1.65; white-space:pre-wrap; overflow-wrap:anywhere; }
.preview-media { width:100%; display:flex; align-items:center; justify-content:center; background:#f1f3f7; overflow:hidden; }
.preview-media.square { aspect-ratio:1; }
.preview-media.portrait { aspect-ratio:4/5; }
.preview-media.vertical { aspect-ratio:9/16; }
.preview-media.landscape { aspect-ratio:16/9; }
.preview-media img,.preview-media video { width:100%; height:100%; object-fit:cover; }
.preview-placeholder { padding:40px; text-align:center; color:#626b7d; font-size:12px; }
.post-engagement { display:flex; justify-content:space-between; gap:5px; border-bottom:1px solid #e5e8ef; color:#606979; font-size:11px; padding:10px 14px; }
.post-actions { display:flex; align-items:center; justify-content:space-around; gap:8px; padding:12px; color:#555f70; font-size:11px; }
.post-actions>span { display:flex; align-items:center; gap:5px; }
.post-actions .ui-icon { width:17px; height:17px; }
.instagram-actions { justify-content:flex-start; padding:12px 14px; color:#252528; gap:14px; }
.instagram-actions .ui-icon { width:21px; height:21px; }
.instagram-actions>span:last-child { margin-inline-start:auto; }
.instagram-caption { padding-top:0; }
.video-preview { position:relative; color:#fff; }
.video-preview .preview-media { background:#171c25; }
.video-overlay { position:absolute; inset-inline:14px 45px; bottom:18px; text-shadow:0 1px 4px #000; }
.video-overlay strong { font-size:12px; }
.video-overlay p { font-size:11px; line-height:1.7; white-space:pre-wrap; overflow-wrap:anywhere; margin:7px 0; max-height:130px; overflow:hidden; }
.video-overlay small { font-size:10px; }
.video-side { position:absolute; inset-inline-end:10px; bottom:70px; display:grid; gap:22px; }
.video-side .ui-icon { width:23px; height:23px; filter:drop-shadow(0 1px 2px #333); }
.youtube-title { padding:13px 14px 0; font-size:14px; font-weight:600; }
.preview-note { display:flex; align-items:start; gap:7px; font-size:11px; color:var(--muted); line-height:1.6; margin-top:14px; }
.preview-note .ui-icon { width:15px; height:15px; }
.calendar-toolbar,.month-picker,.legend,.list-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.month-picker { justify-content:flex-start; }
.month-picker h2 { min-width:130px; text-align:center; font-size:14px; }
.legend { gap:14px; font-size:11px; color:var(--muted); flex-wrap:wrap; }
.legend i { width:5px; height:5px; display:inline-block; margin-inline-end:5px; border-radius:50%; }
.scheduled-dot { background:var(--accent); }.published-dot { background:var(--success); }.draft-dot { background:var(--muted); }
.calendar-scroll { border:1px solid var(--line); border-radius:4px; overflow:auto; margin-top:18px; background:var(--surface); }
.weekday-row { display:grid; grid-template-columns:repeat(7,1fr); border-bottom:1px solid var(--line); }
.weekday-row span { font-size:11px; padding:10px; text-align:end; color:var(--muted); }
.calendar-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); }
.calendar-cell { min-height:126px; border-inline-end:1px solid var(--line); border-bottom:1px solid var(--line); padding:7px; overflow:hidden; }
.calendar-cell:nth-child(7n) { border-inline-end:0; }.calendar-cell.outside { background:var(--canvas); }
.date-button { display:block; margin-inline-start:auto; color:var(--muted); border:0; background:none; border-radius:4px; font-size:11px; width:26px; height:26px; }.date-button.today { background:var(--accent); color:var(--on-accent); }
.calendar-event { display:block; width:100%; text-align:start; background:color-mix(in srgb,var(--accent) 5%,var(--surface)); border:0; border-inline-start:2px solid var(--accent); color:var(--text); border-radius:3px; margin-top:6px; padding:6px; font-size:11px; }
.calendar-event.draft { border-color:var(--muted); background:var(--canvas); }.calendar-event.published { border-color:var(--success); background:var(--canvas); }
.calendar-event strong { display:block; margin:3px 0; font-size:11px; font-weight:500; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }.calendar-event small { font-size:10px; color:var(--muted); }
.list-toolbar { margin-bottom:16px; }.list-toolbar select { width:155px; }
.post-row { display:flex; align-items:center; gap:14px; border-bottom:1px solid var(--line); padding:14px 4px; }.post-row:first-child { border-top:1px solid var(--line); }
.row-media { width:42px; height:42px; object-fit:cover; border-radius:3px; background:var(--subtle); flex:none; }.row-content { flex:1; min-width:0; }.row-content h3 { font-size:13px; font-weight:500; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }.row-content p { color:var(--muted); font-size:11px; margin-top:4px; }
.row-platforms { display:inline-flex; gap:5px; vertical-align:middle; margin-inline-end:5px; }.row-platforms .platform-icon { width:14px; height:14px; }
.account-notice { padding:12px 14px; background:var(--subtle); font-size:12px; color:var(--muted); margin-bottom:16px; border-radius:4px; }
.account-row { display:flex; align-items:center; gap:12px; padding:15px 8px; border-bottom:1px solid var(--line); }.account-row>div { flex:1; min-width:0; }.account-row strong { font-size:13px; font-weight:500; display:block; }.account-row small { font-size:11px; color:var(--muted); }.account-row .platform-icon { width:28px; height:28px; }
#toast { position:sticky; bottom:12px; display:none; align-items:center; gap:18px; width:max-content; max-width:calc(100% - 24px); margin:0 auto 12px; padding:10px 14px; color:var(--text); background:var(--surface); border:1px solid var(--control); border-radius:5px; box-shadow:0 4px 18px #0002; font-size:12px; z-index:10; }
#undo-delete { color:var(--accent); font-size:12px; background:none; border:0; padding:2px 4px; }
.empty-state { display:grid; justify-items:center; gap:12px; padding:60px 20px; text-align:center; color:var(--muted); font-size:13px; }.empty-state .ui-icon { width:28px; height:28px; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
@container(max-width:1000px) { .compose-grid { grid-template-columns:minmax(0,1fr) minmax(280px,350px); gap:18px; }.content { padding:18px; }.studio-toolbar { padding-inline:18px; } }
@container(max-width:780px) { .compose-grid { grid-template-columns:minmax(0,1fr); }.preview-column { max-width:none; }.preview-card { max-width:380px; }.calendar-toolbar { align-items:start; flex-direction:column; }.calendar-grid,.weekday-row { min-width:700px; }.content { padding:16px; }#workspace-name { display:none; } }
@container(max-width:520px) { .studio-toolbar { padding:10px 12px; flex-wrap:wrap; gap:8px; }.module-title { gap:8px; }h1 { font-size:14px; }.toolbar-actions { margin-inline-start:auto; }.toolbar-actions #new-post { font-size:0; gap:0; width:32px; padding:6px; }.studio-tabs { gap:0; padding-inline:8px; justify-content:space-between; }.studio-tabs>button { gap:5px; padding-inline:5px; font-size:11px; }.studio-tabs .ui-icon { width:15px; height:15px; }.content { padding:12px; }.editor-body { padding:14px; }.field-row { grid-template-columns:minmax(0,1fr); gap:12px; }.editor-footer { padding:12px; flex-wrap:wrap; }.editor-footer>div { gap:5px; }.button { padding:6px 9px; font-size:11px; }.channel { font-size:11px; padding:6px 8px; }.channel-picker { gap:6px; }.preview-column { padding:13px; }.preview-heading>span { font-size:10px; }.post-row { gap:9px; flex-wrap:wrap; }.row-content { min-width:130px; }.row-content p { word-break:break-word; }.post-row>.status { margin-inline-start:auto; }.legend { gap:10px; }.account-row { padding:12px 3px; }.account-row small { overflow-wrap:anywhere; }.month-picker { gap:6px; }.month-picker h2 { min-width:120px; }.local-pill { font-size:10px; }.tab-count { display:none; } }
@media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto!important; transition:none!important; } }
`;

export const poster = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201080%201080%22%3E%3Crect%20width%3D%221080%22%20height%3D%221080%22%20fill%3D%22%231747e7%22/%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%235378f4%22%20stroke-width%3D%222%22%3E%3Ccircle%20cx%3D%22890%22%20cy%3D%22210%22%20r%3D%22350%22/%3E%3Ccircle%20cx%3D%22890%22%20cy%3D%22210%22%20r%3D%22290%22/%3E%3Ccircle%20cx%3D%22890%22%20cy%3D%22210%22%20r%3D%22230%22/%3E%3C/g%3E%3Cpath%20d%3D%22M770%20680h210v210H770z%22%20fill%3D%22%23c4f0b0%22/%3E%3Cpath%20d%3D%22M680%20980V770h210%22%20fill%3D%22none%22%20stroke%3D%22%23c4f0b0%22%20stroke-width%3D%2224%22/%3E%3Ctext%20x%3D%2282%22%20y%3D%22108%22%20fill%3D%22white%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2227%22%20letter-spacing%3D%224%22%3ESOCIAL%20STUDIO%3C/text%3E%3Ctext%20x%3D%2278%22%20y%3D%22382%22%20fill%3D%22white%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%22122%22%20font-weight%3D%22bold%22%3EOne%20idea.%3C/text%3E%3Ctext%20x%3D%2278%22%20y%3D%22520%22%20fill%3D%22white%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%22122%22%20font-weight%3D%22bold%22%3EEvery%3C/text%3E%3Ctext%20x%3D%2278%22%20y%3D%22658%22%20fill%3D%22white%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%22122%22%20font-weight%3D%22bold%22%3Echannel.%3C/text%3E%3Ctext%20x%3D%2282%22%20y%3D%22952%22%20fill%3D%22%23dce5ff%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2226%22%3EMake%20room%20for%20your%20next%20story.%3C/text%3E%3C/svg%3E%0A";
