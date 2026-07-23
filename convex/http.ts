import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Serve the embeddable widget JS
http.route({
  path: "/widget.js",
  method: "GET",
  handler: httpAction(async () => {
    const widgetJs = getWidgetJs();
    return new Response(widgetJs, {
      headers: {
        "Content-Type": "application/javascript",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    });
  }),
});

// CORS preflight
http.route({
  path: "/widget.js",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// ── Standalone widget test page ───────────────────────────────────────────────
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const convexUrl = req.url.replace(/\/test$/, "").replace(".convex.site", ".convex.cloud");
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeuralSupport Widget Test</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e8eaf0; min-height: 100vh; }
    .page { max-width: 860px; margin: 0 auto; padding: 48px 24px; }
    .badge { display: inline-block; background: #22c55e22; color: #4ade80; border: 1px solid #22c55e44; border-radius: 20px; font-size: 12px; font-weight: 600; padding: 4px 12px; letter-spacing: 0.05em; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .sub { color: rgba(255,255,255,0.45); font-size: 15px; margin-bottom: 40px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; }
    .card h3 { font-size: 13px; color: rgba(255,255,255,0.4); font-weight: 500; margin-bottom: 6px; letter-spacing: 0.04em; text-transform: uppercase; }
    .card p { font-size: 14px; color: #e8eaf0; word-break: break-all; }
    .prompts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 40px; }
    .prompt-btn {
      background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
      color: #a5b4fc; border-radius: 20px; padding: 7px 16px; font-size: 13px;
      cursor: pointer; transition: background 0.15s;
    }
    .prompt-btn:hover { background: rgba(99,102,241,0.25); }
    .log-box { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.7; max-height: 220px; overflow-y: auto; color: rgba(255,255,255,0.6); }
    .log-box .ok { color: #4ade80; }
    .log-box .err { color: #f87171; }
    .log-box .info { color: #818cf8; }
    .tip { margin-top: 32px; background: rgba(251,191,36,0.07); border: 1px solid rgba(251,191,36,0.2); border-radius: 10px; padding: 14px 18px; font-size: 13px; color: rgba(251,191,36,0.8); }
  </style>
</head>
<body>
<div class="page">
  <div class="badge">● LIVE TEST</div>
  <h1>NeuralSupport Widget</h1>
  <p class="sub">Isolated test page — changes here reflect instantly after <code>npx convex deploy</code></p>

  <div class="cards">
    <div class="card"><h3>Convex URL</h3><p id="c-url">—</p></div>
    <div class="card"><h3>Site URL</h3><p id="c-site">—</p></div>
    <div class="card"><h3>Session ID</h3><p id="c-session">—</p></div>
    <div class="card"><h3>Widget Status</h3><p id="c-status">Loading…</p></div>
  </div>

  <p style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:12px;">Quick-fire test prompts →</p>
  <div class="prompts">
    <button class="prompt-btn" onclick="injectMsg('What investment plans do you offer?')">Investment plans</button>
    <button class="prompt-btn" onclick="injectMsg('Tell me about the Horizon plan')">Horizon plan</button>
    <button class="prompt-btn" onclick="injectMsg('How does WalletConnect work?')">WalletConnect</button>
    <button class="prompt-btn" onclick="injectMsg('What is the WOLV token?')">WOLV token</button>
    <button class="prompt-btn" onclick="injectMsg('stability')">stability (one word)</button>
    <button class="prompt-btn" onclick="injectMsg('your roadmap')">roadmap</button>
    <button class="prompt-btn" onclick="injectMsg('wallet connect')">wallet connect</button>
    <button class="prompt-btn" onclick="injectMsg('How do I withdraw?')">Withdraw</button>
  </div>

  <p style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:10px;">Console log</p>
  <div class="log-box" id="log">Waiting for widget events…<br></div>

  <div class="tip">💡 The widget bubble is in the bottom-right corner. Click it to open, or use the prompt buttons above to fire messages directly.</div>
</div>

<script>
  var CONVEX_URL = '${convexUrl}';
  var SITE_URL = window.location.origin;

  document.getElementById('c-url').textContent = CONVEX_URL;
  document.getElementById('c-site').textContent = SITE_URL;

  function log(msg, cls) {
    var box = document.getElementById('log');
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = new Date().toLocaleTimeString() + '  ' + msg;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  // Intercept fetch to log Convex calls
  var _fetch = window.fetch;
  window.fetch = function(url, opts) {
    if (url && String(url).includes('convex.cloud')) {
      var body = opts && opts.body ? JSON.parse(opts.body) : {};
      log('→ ' + (body.path || url), 'info');
      return _fetch.apply(this, arguments).then(function(r) {
        var status = r.status;
        var clone = r.clone();
        clone.json().then(function(d) {
          if (d.status === 'error' || d.errorMessage) {
            log('✗ ' + (d.errorMessage || JSON.stringify(d)).slice(0, 120), 'err');
            document.getElementById('c-status').textContent = '❌ Error — see log';
          } else {
            log('✓ ' + (body.path || '').split(':')[1] + ' 200', 'ok');
            document.getElementById('c-status').textContent = '✅ Connected';
          }
        }).catch(function(){});
        return r;
      });
    }
    return _fetch.apply(this, arguments);
  };

  // Inject a message directly into the open widget input
  function injectMsg(text) {
    var inp = document.getElementById('ns-input');
    var send = document.getElementById('ns-send');
    var win = document.getElementById('ns-window');
    if (!inp) { log('Widget not loaded yet', 'err'); return; }
    if (!win.classList.contains('ns-open')) {
      document.getElementById('ns-bubble').click();
      setTimeout(function() { injectMsg(text); }, 350);
      return;
    }
    inp.value = text;
    inp.dispatchEvent(new Event('input'));
    send.click();
    log('Sent: ' + text, 'info');
  }

  // Load the widget
  window.NeuralSupportConfig = {
    convexUrl: CONVEX_URL,
    siteUrl: 'wolvcapital.com',
    agentName: 'Alex',
    greeting: 'Hi! Ask me anything about WolvCapital 👋',
    primaryColor: '#6366f1',
  };

  var s = document.createElement('script');
  s.src = window.location.origin.replace('.convex.cloud', '.convex.site') + '/widget.js';
  s.onload = function() {
    document.getElementById('c-session').textContent =
      localStorage.getItem('ns_session_wolvcapital.com') || '(opens on first chat)';
    log('widget.js loaded ✓', 'ok');
  };
  s.onerror = function() { log('widget.js failed to load', 'err'); };
  document.body.appendChild(s);
</script>
</body>
</html>`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }),
});

export default http;

// ── Widget JS (self-contained, no dependencies) ───────────────────────────────

function getWidgetJs(): string {
  return `
(function() {
  'use strict';

  var config = window.NeuralSupportConfig || {};

  // Auto-fix: force .convex.cloud — /api/query and /api/mutation only work on .convex.cloud, not .convex.site
  var rawUrl = (config.convexUrl || '').replace(/\\/+$/, '');
  var CONVEX_URL = rawUrl.replace('.convex.site', '.convex.cloud');

  var SITE_URL = config.siteUrl || window.location.origin;
  var PRIMARY = config.primaryColor || '#6366f1';
  var GREETING = config.greeting || "Hi! How can I help you today? 👋";
  var AGENT_NAME = config.agentName || 'Support';
  var POSITION = config.position || 'right'; // 'right' | 'left'
  var QUICK_QUESTIONS = Array.isArray(config.quickQuestions) ? config.quickQuestions.slice(0, 4) : [];

  if (!CONVEX_URL) {
    console.warn('[NeuralSupport] convexUrl not configured');
    return;
  }

  // ── Session ID ──────────────────────────────────────────────────────────────
  var SESSION_KEY = 'ns_session_' + SITE_URL;
  var sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  // ── State ───────────────────────────────────────────────────────────────────
  var isOpen = false;
  var conversationId = null;
  var agentMode = false;
  var messages = [];
  var isTyping = false;
  var lastMsgTimestamp = null;
  var visitorName = localStorage.getItem('ns_name_' + SITE_URL) || '';
  var visitorEmail = localStorage.getItem('ns_email_' + SITE_URL) || '';
  var pollInterval = null;

  // ── Convex helpers ──────────────────────────────────────────────────────────
  function convexMutation(name, args) {
    return fetch(CONVEX_URL + '/api/mutation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: name, args: args, format: 'json' }),
    }).then(function(r) { return r.json(); }).then(function(d) { return d.value; });
  }

  function convexQuery(name, args) {
    return fetch(CONVEX_URL + '/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: name, args: args, format: 'json' }),
    }).then(function(r) { return r.json(); }).then(function(d) { return d.value; });
  }

  // ── Inject CSS ──────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = \`
    #ns-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #ns-widget { position: fixed; \${POSITION === 'left' ? 'left: 16px' : 'right: 16px'}; bottom: 16px; z-index: 2147483647; }
    #ns-bubble {
      width: 56px; height: 56px; border-radius: 50%;
      background: \${PRIMARY}; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s; position: relative;
    }
    #ns-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
    #ns-bubble svg { width: 24px; height: 24px; fill: white; }
    #ns-badge {
      position: absolute; top: -4px; right: -4px; width: 16px; height: 16px;
      background: #ef4444; border-radius: 50%; border: 2px solid white;
      display: none; align-items: center; justify-content: center;
      font-size: 8px; color: white; font-weight: bold;
    }
    #ns-window {
      position: fixed; \${POSITION === 'left' ? 'left: 16px' : 'right: 16px'}; bottom: 82px;
      width: 360px; max-width: calc(100vw - 32px);
      height: 560px; max-height: calc(100vh - 100px);
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05);
      display: none; flex-direction: column;
      background: #0f1120; color: #e8eaf0;
      transform: translateY(12px) scale(0.96); opacity: 0;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    }
    #ns-window.ns-open { transform: translateY(0) scale(1); opacity: 1; display: flex; }
    #ns-header {
      padding: 14px 16px; display: flex; align-items: center; gap: 12px;
      background: \${PRIMARY}; color: white; flex-shrink: 0;
    }
    #ns-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: white;
    }
    #ns-avatar svg { width: 19px; height: 19px; }
    #ns-header-info { flex: 1; min-width: 0; }
    #ns-header-name { font-size: 15px; font-weight: 600; }
    #ns-header-status { font-size: 12px; opacity: 0.88; display: flex; align-items: center; gap: 5px; margin-top: 1px; }
    #ns-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; }
    #ns-close { background: none; border: none; cursor: pointer; color: white; opacity: 0.8; padding: 4px; }
    #ns-close:hover { opacity: 1; }
    #ns-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    #ns-messages::-webkit-scrollbar { width: 3px; }
    #ns-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .ns-msg { display: flex; gap: 8px; max-width: 85%; }
    .ns-msg.ns-visitor { align-self: flex-end; flex-direction: row-reverse; }
    .ns-msg.ns-ai, .ns-msg.ns-agent { align-self: flex-start; }
    .ns-msg-icon {
      width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 11px; margin-top: 2px;
    }
    .ns-msg.ns-ai .ns-msg-icon { background: rgba(99,102,241,0.2); color: #818cf8; }
    .ns-msg.ns-agent .ns-msg-icon { background: rgba(34,197,94,0.2); color: #4ade80; }
    .ns-msg-body { display: flex; flex-direction: column; gap: 2px; }
    .ns-msg-label { font-size: 11px; color: rgba(255,255,255,0.45); padding: 0 6px; font-weight: 500; }
    .ns-bubble-text {
      padding: 10px 14px; border-radius: 14px; font-size: 14.5px; line-height: 1.55;
      word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.15);
    }
    .ns-msg.ns-visitor .ns-bubble-text { background: \${PRIMARY}; color: white; border-radius: 14px 14px 4px 14px; }
    .ns-msg.ns-ai .ns-bubble-text { background: rgba(255,255,255,0.07); color: #e8eaf0; border-radius: 4px 14px 14px 14px; }
    .ns-msg.ns-agent .ns-bubble-text { background: rgba(34,197,94,0.12); color: #d1fae5; border: 1px solid rgba(34,197,94,0.2); border-radius: 4px 14px 14px 14px; }
    .ns-typing {
      align-self: flex-start; display: flex; gap: 8px; align-items: center;
    }
    .ns-typing-dots { display: flex; gap: 4px; padding: 10px 14px; background: rgba(255,255,255,0.07); border-radius: 14px; }
    .ns-typing-dots span { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: ns-bounce 1.2s infinite; }
    .ns-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ns-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ns-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    #ns-quick-questions { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 4px 32px; max-width: calc(85% - 32px); }
    .ns-quick-btn {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
      color: #cdd2e6; border-radius: 16px; padding: 7px 13px; font-size: 12.5px;
      cursor: pointer; text-align: left; line-height: 1.3; transition: background 0.15s, border-color 0.15s;
    }
    .ns-quick-btn:hover { background: rgba(255,255,255,0.12); border-color: \${PRIMARY}; }
    #ns-identity-form {
      padding: 16px; background: rgba(255,255,255,0.035); border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
    }
    #ns-identity-title { font-size: 13.5px; font-weight: 600; color: #e8eaf0; margin: 0 0 3px; }
    #ns-identity-reason { font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.5); margin: 0 0 12px; }
    .ns-input-col { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .ns-identity-field { display: flex; flex-direction: column; gap: 4px; }
    .ns-identity-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: rgba(255,255,255,0.4); }
    .ns-identity-input {
      width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 9px; padding: 10px 12px; color: #e8eaf0; font-size: 14px; outline: none; transition: border-color 0.15s;
    }
    .ns-identity-input:focus { border-color: \${PRIMARY}; }
    .ns-identity-input::placeholder { color: rgba(255,255,255,0.3); }
    .ns-identity-actions { display: flex; gap: 10px; align-items: center; }
    #ns-identity-save {
      flex: 1; background: \${PRIMARY}; color: white; border: none; border-radius: 9px;
      padding: 9px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
    }
    #ns-identity-save:hover { opacity: 0.9; }
    #ns-identity-skip {
      font-size: 12.5px; background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 9px 4px;
    }
    #ns-identity-skip:hover { color: rgba(255,255,255,0.65); }
    #ns-input-area {
      padding: 12px 12px 14px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; gap: 8px; flex-shrink: 0;
      background: rgba(0,0,0,0.2);
    }
    #ns-input {
      flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 10px 14px; color: #e8eaf0; font-size: 14.5px; outline: none; resize: none;
      line-height: 1.45; max-height: 100px; transition: border-color 0.2s;
    }
    #ns-input:focus { border-color: \${PRIMARY}; }
    #ns-input::placeholder { color: rgba(255,255,255,0.3); }
    #ns-send {
      width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
      background: \${PRIMARY}; color: white; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity 0.2s, transform 0.1s; align-self: flex-end;
    }
    #ns-send:disabled { opacity: 0.4; cursor: default; }
    #ns-send:not(:disabled):hover { opacity: 0.9; transform: scale(1.05); }
    #ns-powered { text-align: center; font-size: 10.5px; color: rgba(255,255,255,0.28); padding: 6px 0 8px; flex-shrink: 0; }
    @media (max-width: 420px) {
      #ns-window { width: calc(100vw - 16px) !important; left: 8px !important; right: 8px !important; height: calc(100vh - 90px) !important; }
    }
    #ns-bubble.ns-pulse::before {
      content: ''; position: absolute; inset: -6px; border-radius: 50%;
      border: 2px solid \${PRIMARY}; opacity: 0; animation: ns-pulse-ring 2.4s ease-out 3;
    }
    @keyframes ns-pulse-ring {
      0% { transform: scale(0.85); opacity: 0.55; }
      70% { transform: scale(1.4); opacity: 0; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    #ns-teaser {
      position: fixed; \${POSITION === 'left' ? 'left: 16px' : 'right: 16px'}; bottom: 84px;
      max-width: 236px; background: #1a1c2e; color: #e8eaf0; border-radius: 14px 14px \${POSITION === 'left' ? '14px 4px' : '4px 14px'};
      padding: 12px 34px 12px 14px; font-size: 13.5px; line-height: 1.5;
      box-shadow: 0 10px 34px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06);
      display: none; cursor: pointer; z-index: 2147483646;
      animation: ns-teaser-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    #ns-teaser.ns-show { display: block; }
    @keyframes ns-teaser-in { from { opacity: 0; transform: translateY(8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    #ns-teaser-close {
      position: absolute; top: 6px; right: 6px; background: none; border: none;
      color: rgba(255,255,255,0.35); cursor: pointer; padding: 4px; line-height: 0;
    }
    #ns-teaser-close:hover { color: rgba(255,255,255,0.75); }
  \`;
  document.head.appendChild(style);

  // ── Build DOM ───────────────────────────────────────────────────────────────
  var widget = document.createElement('div');
  widget.id = 'ns-widget';
  widget.innerHTML = \`
    <div id="ns-window" role="dialog" aria-label="Support Chat">
      <div id="ns-header">
        <div id="ns-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg></div>
        <div id="ns-header-info">
          <div id="ns-header-name">\${AGENT_NAME}</div>
          <div id="ns-header-status"><div id="ns-status-dot"></div> Online · Typically replies instantly</div>
        </div>
        <button id="ns-close" aria-label="Close chat">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="ns-messages"></div>
      <div id="ns-identity-form" style="display:none">
        <p id="ns-identity-title">Before we continue</p>
        <p id="ns-identity-reason">Leave your email so we can follow up if you get disconnected or a specialist needs to reach you — we'll never use it for anything else.</p>
        <div class="ns-input-col">
          <div class="ns-identity-field">
            <label class="ns-identity-label" for="ns-name-inp">Name</label>
            <input id="ns-name-inp" class="ns-identity-input" placeholder="Jane Doe" value="" autocomplete="name">
          </div>
          <div class="ns-identity-field">
            <label class="ns-identity-label" for="ns-email-inp">Email</label>
            <input id="ns-email-inp" class="ns-identity-input" type="email" placeholder="you@example.com" value="" autocomplete="email">
          </div>
        </div>
        <div class="ns-identity-actions">
          <button id="ns-identity-save">Save</button>
          <button id="ns-identity-skip">Not now</button>
        </div>
      </div>
      <div id="ns-input-area">
        <textarea id="ns-input" placeholder="Type a message..." rows="1" aria-label="Message input"></textarea>
        <button id="ns-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div id="ns-powered">Powered by NeuralSupport AI</div>
    </div>
    <div id="ns-teaser" role="button" aria-label="Open support chat">
      <span id="ns-teaser-text"></span>
      <button id="ns-teaser-close" aria-label="Dismiss">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <button id="ns-bubble" aria-label="Open support chat">
      <div id="ns-badge"></div>
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
  \`;
  document.body.appendChild(widget);

  var $window = document.getElementById('ns-window');
  var $bubble = document.getElementById('ns-bubble');
  var $messages = document.getElementById('ns-messages');
  var $input = document.getElementById('ns-input');
  var $send = document.getElementById('ns-send');
  var $badge = document.getElementById('ns-badge');
  var $identityForm = document.getElementById('ns-identity-form');
  var $teaser = document.getElementById('ns-teaser');
  var $teaserText = document.getElementById('ns-teaser-text');

  // ── Proactive teaser bubble ─────────────────────────────────────────────────
  // Signals that support exists before the visitor ever clicks the bubble —
  // a pulse ring plus a one-time greeting popup, same pattern Intercom/Crisp use.
  var TEASER_KEY = 'ns_teaser_dismissed_' + SITE_URL;

  function dismissTeaser() {
    $teaser.classList.remove('ns-show');
    $bubble.classList.remove('ns-pulse');
    localStorage.setItem(TEASER_KEY, '1');
  }

  if (!localStorage.getItem(TEASER_KEY)) {
    $bubble.classList.add('ns-pulse');
    setTimeout(function() {
      if (isOpen) return;
      $teaserText.textContent = GREETING;
      $teaser.classList.add('ns-show');
    }, 4000);
  }

  $teaser.addEventListener('click', function() {
    dismissTeaser();
    openWidget();
  });
  document.getElementById('ns-teaser-close').addEventListener('click', function(e) {
    e.stopPropagation();
    dismissTeaser();
  });

  // ── Render a message ────────────────────────────────────────────────────────
  function renderMsg(msg) {
    var div = document.createElement('div');
    div.className = 'ns-msg ns-' + msg.role;
    div.dataset.id = msg._id || msg.tempId || '';

    var AGENT_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>';
    var AI_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';
    var iconSvg = msg.role === 'agent' ? AGENT_ICON : msg.role === 'ai' ? AI_ICON : '';
    var icon = msg.role !== 'visitor' ? '<div class="ns-msg-icon">' + iconSvg + '</div>' : '';
    var label = '';
    if (msg.role === 'agent' && msg.agentName) label = '<div class="ns-msg-label">' + msg.agentName + '</div>';

    div.innerHTML = icon + '<div class="ns-msg-body">' + label + '<div class="ns-bubble-text">' + (msg.role === 'visitor' ? escapeHtml(msg.content) : renderMarkdown(msg.content)) + '</div></div>';
    return div;
  }

  function renderMarkdown(s) {
    var e = String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // Markdown tables -> simple lines: drop |---| separators, join cells with a dash
    e = e.replace(/^\\s*\\|?[\\s:|-]+\\|[\\s:|-]*$/gm, '');
    e = e.replace(/^\\s*\\|(.+)\\|\\s*$/gm, function(_, row) {
      return row.split('|').map(function(c){ return c.trim(); }).filter(Boolean).join(' \u2014 ');
    });
    // Headers (### Title) -> bold line
    e = e.replace(/^#{1,6}\\s+(.+)$/gm, '<strong>$1</strong>');
    e = e.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    e = e.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
    e = e.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#818cf8;text-decoration:underline;">$1</a>');
    e = e.replace(/^[\\-\\*] (.+)$/gm, '<li style="margin:2px 0;">$1</li>');
    e = e.replace(/(<li[^>]*>(?:.|\\n)*?<\\/li>(?:\\n<li[^>]*>(?:.|\\n)*?<\\/li>)*)/g, '<ul style="margin:4px 0;padding-left:16px;list-style:disc;">$1</ul>');
    e = e.replace(/\\n{3,}/g, '\\n\\n');
    e = e.replace(/\\n/g, '<br>');
    return e;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function addMessage(msg) {
    messages.push(msg);
    $messages.appendChild(renderMsg(msg));
    scrollToBottom();
  }

  function scrollToBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  function showTyping() {
    removeTyping();
    var t = document.createElement('div');
    t.className = 'ns-msg ns-ai ns-typing';
    t.id = 'ns-typing';
    t.innerHTML = '<div class="ns-typing-dots"><span></span><span></span><span></span></div>';
    $messages.appendChild(t);
    scrollToBottom();
  }

  function removeTyping() {
    var t = document.getElementById('ns-typing');
    if (t) t.remove();
  }

  // ── Open / close ────────────────────────────────────────────────────────────
  function openWidget() {
    isOpen = true;
    dismissTeaser();
    $window.style.display = 'flex';
    requestAnimationFrame(function() { $window.classList.add('ns-open'); });
    $badge.style.display = 'none';
    $input.focus();
    if (messages.length === 0) {
      addMessage({ _id: 'greeting', role: 'ai', content: GREETING });
      renderQuickQuestions();
      if (!visitorName) showIdentityForm();
    }
    fetchGeoOnce();
    startPolling();
  }

  function closeWidget() {
    isOpen = false;
    $window.classList.remove('ns-open');
    setTimeout(function() { $window.style.display = 'none'; }, 250);
    stopPolling();
  }

  $bubble.addEventListener('click', function() {
    if (isOpen) closeWidget(); else openWidget();
  });
  document.getElementById('ns-close').addEventListener('click', closeWidget);

  // ── Identity form ───────────────────────────────────────────────────────────
  function showIdentityForm() {
    $identityForm.style.display = 'block';
    var nameInp = document.getElementById('ns-name-inp');
    var emailInp = document.getElementById('ns-email-inp');
    nameInp.value = visitorName;
    emailInp.value = visitorEmail;

    function saveIdentity() {
      visitorName = nameInp.value.trim();
      visitorEmail = emailInp.value.trim();
      if (visitorName) localStorage.setItem('ns_name_' + SITE_URL, visitorName);
      if (visitorEmail) localStorage.setItem('ns_email_' + SITE_URL, visitorEmail);
      $identityForm.style.display = 'none';
      updateVisitorInfo();
    }

    document.getElementById('ns-identity-save').onclick = saveIdentity;
    document.getElementById('ns-identity-skip').onclick = function() { $identityForm.style.display = 'none'; };
    nameInp.onkeydown = emailInp.onkeydown = function(e) { if (e.key === 'Enter') saveIdentity(); };
  }

  // ── Quick-tap starter questions ─────────────────────────────────────────────
  function renderQuickQuestions() {
    if (!QUICK_QUESTIONS.length || document.getElementById('ns-quick-questions')) return;
    var wrap = document.createElement('div');
    wrap.id = 'ns-quick-questions';
    QUICK_QUESTIONS.forEach(function(q) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ns-quick-btn';
      btn.textContent = q;
      btn.addEventListener('click', function() {
        removeQuickQuestions();
        $input.value = q;
        sendMessage();
      });
      wrap.appendChild(btn);
    });
    $messages.appendChild(wrap);
    scrollToBottom();
  }

  function removeQuickQuestions() {
    var wrap = document.getElementById('ns-quick-questions');
    if (wrap) wrap.remove();
  }

  function updateVisitorInfo() {
    if (visitorName || visitorEmail) {
      convexMutation('visitors:upsertVisitor', {
        sessionId: sessionId,
        name: visitorName || undefined,
        email: visitorEmail || undefined,
      }).catch(function(){});
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────
  function sendMessage() {
    var content = $input.value.trim();
    if (!content) return;
    $input.value = '';
    $input.style.height = '';
    removeQuickQuestions();

    addMessage({ tempId: 'tmp_' + Date.now(), role: 'visitor', content: content });
    showTyping();

    convexMutation('widget:visitorSendMessage', {
      sessionId: sessionId,
      content: content,
      siteUrl: SITE_URL,
    }).then(function(result) {
      if (result) conversationId = result.conversationId;
    }).catch(function(e) {
      removeTyping();
      addMessage({ tempId: 'err_' + Date.now(), role: 'ai', content: 'Sorry, something went wrong. Please try again.' });
    });
  }

  $send.addEventListener('click', sendMessage);
  $input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  $input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  // ── Polling for new messages ─────────────────────────────────────────────────
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(pollMessages, 1500);
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  function pollMessages() {
    var convoId = conversationId;
    if (!convoId) {
      convexQuery('conversations:getConversationBySession', { sessionId: sessionId }).then(function(convo) {
        if (convo) conversationId = convo._id;
      }).catch(function(){});
      return;
    }

    convexQuery('messages:getMessages', { conversationId: convoId }).then(function(serverMsgs) {
      if (!serverMsgs || !serverMsgs.length) return;

      var knownIds = new Set(messages.map(function(m) { return m._id; }));
      var newMsgs = serverMsgs.filter(function(m) { return !knownIds.has(m._id) && m.role !== 'visitor'; });

      if (newMsgs.length > 0) {
        removeTyping();
        newMsgs.forEach(function(m) {
          addMessage(m);
          if (!isOpen) {
            $badge.style.display = 'flex';
            $badge.textContent = '!';
          }
        });
      }

      convexQuery('conversations:getConversationBySession', { sessionId: sessionId }).then(function(convo) {
        if (convo) agentMode = convo.agentMode;
      }).catch(function(){});
    }).catch(function(){});
  }

  // ── Init widget ─────────────────────────────────────────────────────────────
  convexMutation('widget:widgetInit', {
    sessionId: sessionId,
    currentPage: window.location.href,
    currentPageTitle: document.title,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
    siteUrl: SITE_URL,
  }).catch(function(){});

  // Track page navigation (SPA-friendly)
  var lastPage = window.location.href;
  setInterval(function() {
    if (window.location.href !== lastPage) {
      lastPage = window.location.href;
      convexMutation('visitors:updateVisitorPage', {
        sessionId: sessionId,
        currentPage: window.location.href,
        currentPageTitle: document.title,
      }).catch(function(){});
    }
  }, 1500);

  // Get geo location — deferred until widget opens to avoid leaking on every page load.
  // ipapi.co's free tier rate-limits hard (429s in normal traffic); ipwho.is has a much
  // more generous anonymous quota and returns the same shape of data.
  var geoFetched = false;
  function fetchGeoOnce() {
    if (geoFetched) return;
    geoFetched = true;
    fetch('https://ipwho.is/')
      .then(function(r) { return r.json(); })
      .then(function(geo) {
        if (geo.success === false) return;
        convexMutation('visitors:updateVisitorLocation', {
          sessionId: sessionId,
          country: geo.country || undefined,
          countryCode: geo.country_code || undefined,
          city: geo.city || undefined,
          ip: geo.ip || undefined,
        }).catch(function(){});
      }).catch(function(){});
  }

  // Mark offline on page leave — sendBeacon must use application/json Blob
  // or Convex rejects with "missing field path" (it ignores text/plain bodies)
  window.addEventListener('beforeunload', function() {
    if (navigator.sendBeacon) {
      var body = JSON.stringify({
        path: 'visitors:markVisitorOffline',
        args: { sessionId: sessionId },
        format: 'json',
      });
      navigator.sendBeacon(
        CONVEX_URL + '/api/mutation',
        new Blob([body], { type: 'application/json' })
      );
    }
  });

})();
`;
}