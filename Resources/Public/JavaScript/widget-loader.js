(function () {
  'use strict';

  // Entry point: validate config, then gate the widget on chatbot availability.
  function init() {
    const root = document.querySelector('.studi-assist-chatbot-root');
    if (!root) return;

    const chatbotUrl = root.getAttribute('data-chatbot-url');
    if (!chatbotUrl) return;

    // Parse the chatbot URL once. Its origin is the tenant-prefixed host
    // (e.g. https://uni-mannheim.studi-assist.de), which is exactly where the
    // status endpoint lives — the backend resolves the tenant from that host.
    let parsedChatbotUrl;
    try {
      parsedChatbotUrl = new URL(chatbotUrl, window.location.origin);
      if (parsedChatbotUrl.protocol !== 'https:' && parsedChatbotUrl.protocol !== 'http:') return;
    } catch (_) {
      return;
    }

    // Avoid double-init. Set before the async check so a second script include
    // can't fire a second availability fetch / build.
    if (window.__studiAssistChatbotWidgetInitialized) return;
    window.__studiAssistChatbotWidgetInitialized = true;

    // Only render the launcher if the chatbot is available (not over its monthly
    // cap and not turned off). Fails OPEN — never hides on our own error.
    fetchChatbotAvailability(parsedChatbotUrl).then(function (available) {
      if (available) buildWidget();
    });
  }

  // Pre-flight availability probe.
  // Calls /api/chatbot-status on the SAME origin as the chatbot (the tenant
  // subdomain), so the backend resolves the tenant from the Host header — the
  // widget never needs to know the tenant key. Plain GET, no credentials, no
  // custom headers => a "simple" CORS request (no preflight), matching the
  // endpoint's open, credential-less CORS. Fails OPEN on any error/timeout.
  function fetchChatbotAvailability(parsedChatbotUrl) {
    try {
      // Instance = the /chat/<instance>/... path segment. For
      // /chat/studieninfo/de this is "studieninfo"; falls back to "default".
      var m = parsedChatbotUrl.pathname.match(/\/chat\/([A-Za-z0-9_-]+)/);
      var instance = m ? m[1] : 'default';
      var statusUrl = parsedChatbotUrl.origin + '/api/chatbot-status?instance=' + encodeURIComponent(instance);

      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 2000);

      return fetch(statusUrl, { method: 'GET', signal: controller.signal })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          clearTimeout(timer);
          // Hide ONLY when the server explicitly says available:false.
          return !data || data.available !== false;
        })
        .catch(function () {
          clearTimeout(timer);
          return true; // timeout / network / CORS => show the widget
        });
    } catch (_) {
      return Promise.resolve(true); // fetch/AbortController unavailable => show (fail open)
    }
  }

  // Builds and mounts the full widget. Assumes availability was already checked.
  function buildWidget() {
    // Idempotency: the availability check makes init async, so guard against a
    // second build (e.g. a stale pending fetch after the widget was rebuilt)
    if (document.querySelector('.sacw-root')) return;

    const root = document.querySelector('.studi-assist-chatbot-root');
    if (!root) return;

    const chatbotUrl = root.getAttribute('data-chatbot-url');
    if (!chatbotUrl) return;

    /* ── Helpers ── */
    function normalizeHex(hex) {
      if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
        return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      return hex;
    }

    // Returns a valid 6-digit hex color or the fallback (never blocks rendering)
    function sanitizeHex(value, fallback) {
      var v = (value || '').trim();
      return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v) ? normalizeHex(v) : fallback;
    }

    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }

    function darkenHex(hex, amount) {
      var r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
      var g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
      var b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
      return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
    }

    function mixHex(a, b, t) {
      function ch(i) {
        var x = parseInt(a.slice(i, i + 2), 16);
        var y = parseInt(b.slice(i, i + 2), 16);
        return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
      }
      return '#' + ch(1) + ch(3) + ch(5);
    }

    /* ── Read configuration ── */
    const buttonColor    = sanitizeHex(root.getAttribute('data-button-color'), '#779EC4');
    // Empty gradient end = derive one from the main color, so existing
    // single-color configs automatically get a matching gradient
    const buttonColorEnd = sanitizeHex(root.getAttribute('data-button-color-end'), darkenHex(buttonColor, 60));
    const textColor      = sanitizeHex(root.getAttribute('data-text-color'), '#ffffff');
    const statusDotColor = sanitizeHex(root.getAttribute('data-status-dot-color'), '#34c759');
    const windowBg       = sanitizeHex(root.getAttribute('data-window-background-color'), '#ffffff');
    const headerTitle    = root.getAttribute('data-header-title') || 'StudiAssist';
    const studyProgram   = root.getAttribute('data-study-program') || '';
    const teaserText     = (root.getAttribute('data-teaser-text') || '').trim();
    const showStatusDot  = root.getAttribute('data-show-status-dot') !== '0';
    const showHeader     = root.getAttribute('data-show-header') !== '0';

    var iconStyle = root.getAttribute('data-icon-style') || 'chat';

    // Security: only allow http(s) URLs
    try {
      const parsed = new URL(chatbotUrl, window.location.origin);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
    } catch (_) {
      return;
    }

    // Build final URL – append ?sp= when a study program is configured
    let finalUrl = chatbotUrl;
    if (studyProgram.trim()) {
      try {
        const u = new URL(chatbotUrl, window.location.origin);
        u.searchParams.set('sp', studyProgram.trim().toLowerCase());
        finalUrl = u.href;
      } catch (_) {}
    }

    /* ── Launcher icons ── */
    var ICONS = {
      chat:
        '<svg class="sacw-icon-main" viewBox="0 0 48 48" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M8.5 20.75c0-6.7 6.55-12.13 14.63-12.13s14.62 5.43 14.62 12.13-6.55 12.12-14.62 12.12c-1.42 0-2.79-.17-4.09-.5l-6.63 3.24c-.77.38-1.61-.37-1.3-1.17l1.88-5.02c-2.75-2.18-4.49-5.28-4.49-8.67Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>' +
        '<path d="M17.25 20.9h.04M23.25 20.9h.04M29.25 20.9h.04" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/></svg>',
      sparkle:
        '<svg class="sacw-icon-main" viewBox="0 0 48 48" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M24 5.5c1.1 8.2 5.3 12.4 13.5 13.5C29.3 20.1 25.1 24.3 24 32.5 22.9 24.3 18.7 20.1 10.5 19 18.7 17.9 22.9 13.7 24 5.5Z" fill="currentColor"/>' +
        '<path d="M37.5 27c.5 3.4 2.1 5 5.5 5.5-3.4.5-5 2.1-5.5 5.5-.5-3.4-2.1-5-5.5-5.5 3.4-.5 5-2.1 5.5-5.5Z" fill="currentColor"/></svg>',
      cap:
        '<svg class="sacw-icon-main" viewBox="0 0 48 48" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M24 9.5 5.5 18 24 26.5 42.5 18 24 9.5Z" fill="currentColor"/>' +
        '<path d="M13.5 22.5V31c0 2.9 4.7 5.2 10.5 5.2S34.5 33.9 34.5 31v-8.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M42.5 18v9.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
        '<circle cx="42.5" cy="29.5" r="2.1" fill="currentColor"/></svg>',
      robot:
        '<svg class="sacw-icon-main" viewBox="0 0 48 48" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="10.5" y="16.5" width="27" height="20" rx="6.5" stroke="currentColor" stroke-width="3.2"/>' +
        '<path d="M24 11.5v5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
        '<circle cx="24" cy="9" r="2.4" fill="currentColor"/>' +
        '<circle cx="19" cy="26" r="2.6" fill="currentColor"/><circle cx="29" cy="26" r="2.6" fill="currentColor"/>' +
        '<path d="M6.5 24.5v4M41.5 24.5v4" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
    };
    if (!ICONS[iconStyle]) iconStyle = 'chat';

    var LAUNCHER_CLOSE_ICON =
      '<svg class="sacw-icon-close" viewBox="0 0 48 48" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M14.5 14.5 33.5 33.5M33.5 14.5 14.5 33.5" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';

    var CLOSE_X_ICON =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="18" y1="6" x2="6" y2="18"/>' +
      '<line x1="6" y1="6" x2="18" y2="18"/></svg>';

    /* ── Inject styles (static — configuration flows in via CSS variables) ── */
    var style = document.createElement('style');
    style.textContent = `
    /* ── Backdrop (click-away to close) ── */
    .sacw-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9998;
      display: none;
    }
    .sacw-backdrop[data-active="true"] { display: block; }

    /* ── Launcher button ── */
    .sacw-launcher {
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 78px;
      height: 78px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.86);
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: linear-gradient(145deg, var(--sacw-btn-start) 0%, var(--sacw-btn-mid) 58%, var(--sacw-btn-end) 100%);
      color: var(--sacw-text);
      box-shadow:
        0 20px 42px rgba(31, 60, 91, 0.26),
        0 6px 14px rgba(31, 60, 91, 0.16);
      transition: transform 180ms ease, box-shadow 180ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .sacw-launcher:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow:
        0 24px 50px rgba(31, 60, 91, 0.3),
        0 8px 18px rgba(31, 60, 91, 0.18);
    }
    .sacw-launcher:focus-visible {
      outline: none;
      box-shadow:
        0 0 0 3px var(--sacw-btn-start-45),
        0 12px 28px rgba(31, 60, 91, 0.22);
    }
    .sacw-launcher:active {
      transform: translateY(0) scale(0.97);
      transition-duration: 0.1s;
    }

    /* Status dot (online indicator) — sits ON the circle's rim (half outside)
       so it reads clearly as a badge instead of blending into the button */
    .sacw-launcher::after {
      content: "";
      position: absolute;
      top: -1px;
      right: -1px;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: var(--sacw-status);
      border: 2.5px solid #fff;
      box-shadow: 0 0 0 0 var(--sacw-status-45);
      animation: sacw-pulse 2.4s ease-out infinite;
    }
    @keyframes sacw-pulse {
      0%   { box-shadow: 0 0 0 0 var(--sacw-status-45); }
      70%  { box-shadow: 0 0 0 8px var(--sacw-status-0); }
      100% { box-shadow: 0 0 0 0 var(--sacw-status-0); }
    }
    .sacw-launcher[data-open="true"]::after,
    .sacw-launcher[data-status="off"]::after {
      display: none;
    }

    /* Icon transitions. Visual open/close state is keyed to data-open (our own
       attribute) — NOT aria-expanded, which host-page a11y/theme scripts are
       known to rewrite on buttons they think they manage. */
    .sacw-launcher svg {
      width: 42px;
      height: 42px;
      display: block;
      color: var(--sacw-text);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.2s ease;
      position: absolute;
    }
    .sacw-launcher .sacw-icon-main {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    .sacw-launcher .sacw-icon-close {
      opacity: 0;
      transform: scale(0.5) rotate(-90deg);
    }
    .sacw-launcher[data-open="true"] .sacw-icon-main {
      opacity: 0;
      transform: scale(0.5) rotate(90deg);
    }
    .sacw-launcher[data-open="true"] .sacw-icon-close {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }

    /* Entrance bounce */
    @keyframes sacw-bounce-in {
      0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
      60%  { opacity: 1; transform: scale(1.12) translateY(-6px); }
      80%  { transform: scale(0.95) translateY(2px); }
      100% { transform: scale(1) translateY(0); }
    }
    .sacw-launcher--pulse {
      animation: sacw-bounce-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    /* ── Teaser bubble ── */
    .sacw-teaser {
      position: fixed;
      bottom: 40px;
      right: 122px;
      width: max-content;
      max-width: min(280px, calc(100vw - 150px));
      color: #102844;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 9999;
      display: none;
      opacity: 0;
      transform: translateY(8px) scale(0.98);
      transition: opacity 220ms ease, transform 220ms ease;
      cursor: pointer;
    }
    .sacw-teaser[data-visible="true"] {
      opacity: 1;
      transform: translateY(0);
    }
    .sacw-teaser::after {
      content: "";
      position: absolute;
      right: -6px;
      bottom: 18px;
      width: 12px;
      height: 12px;
      background: #fff;
      transform: rotate(45deg);
      border-radius: 2px;
      box-shadow: 2px -2px 4px rgba(15, 31, 48, 0.04);
    }
    .sacw-teaser-content {
      position: relative;
      width: max-content;
      max-width: 100%;
      background: #fff;
      border: 1px solid rgba(93, 141, 187, 0.16);
      border-radius: 18px;
      box-shadow:
        0 14px 30px rgba(15, 31, 48, 0.16),
        0 4px 10px rgba(15, 31, 48, 0.08);
      line-height: 1.25;
      padding: 12px 15px;
      font-size: 14px;
      font-weight: 750;
    }

    /* ── Chat window ── */
    .sacw-chatbox {
      position: fixed;
      bottom: 122px;
      right: 32px;
      width: min(560px, calc(100vw - 64px));
      height: min(760px, calc(100vh - 150px));
      height: min(760px, calc(100dvh - 150px));
      z-index: 9999;
      display: flex;
      flex-direction: column;
      border-radius: 24px;
      overflow: visible;
      background: var(--sacw-window-bg);
      border: 1px solid rgba(15, 31, 48, 0.08);
      box-shadow:
        0 24px 60px rgba(15, 31, 48, 0.22),
        0 8px 20px rgba(15, 31, 48, 0.12);
      transform-origin: bottom right;

      /* Hidden by default */
      opacity: 0;
      transform: translateY(10px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
                  transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .sacw-chatbox[data-open="true"] {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* ── Header bar — single slim bar ── */
    .sacw-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px 0 16px;
      height: 52px;
      min-height: 52px;
      border-radius: 24px 24px 0 0;
      background: linear-gradient(135deg, var(--sacw-btn-start), var(--sacw-btn-end));
      color: var(--sacw-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .sacw-header-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sacw-status);
      flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
    }
    .sacw-header-dot[data-hidden="true"] { display: none; }

    .sacw-header-title {
      font-size: 14px;
      font-weight: 650;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1 1 auto;
      min-width: 0;
    }

    /* ── Shared style: icon buttons in header ── */
    .sacw-header-btn {
      appearance: none;
      border: none;
      background: transparent;
      color: var(--sacw-text-75);
      width: 32px;
      height: 32px;
      border-radius: 9px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;
      text-decoration: none;
    }
    .sacw-header-btn:hover {
      background: var(--sacw-text-15);
      color: var(--sacw-text);
    }
    .sacw-header-btn:active { opacity: 0.7; }
    .sacw-header-btn:focus-visible {
      outline: 2px solid var(--sacw-text-70);
      outline-offset: -2px;
    }
    .sacw-header-btn svg {
      width: 15px;
      height: 15px;
    }

    /* ── Floating close button (headerless mode) ── */
    .sacw-close-floating {
      position: absolute;
      top: -22px;
      right: -22px;
      z-index: 5;
      appearance: none;
      border: 0;
      background: #fff;
      color: #102844;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 12px 28px rgba(15, 31, 48, 0.18),
        0 0 0 1px rgba(15, 31, 48, 0.08);
      transition: background 160ms ease, transform 160ms ease;
    }
    .sacw-close-floating:hover {
      background: #f4f8fb;
      transform: translateY(-1px);
    }
    .sacw-close-floating:focus-visible {
      outline: 2px solid var(--sacw-btn-end);
      outline-offset: 2px;
    }
    .sacw-close-floating svg {
      width: 16px;
      height: 16px;
    }

    /* ── Iframe body area ── */
    .sacw-body {
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
      overflow: hidden;
      border-radius: 0 0 24px 24px;
      background: var(--sacw-window-bg);
    }
    .sacw-chatbox[data-header="false"] .sacw-body {
      border-radius: 24px;
    }
    .sacw-body iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: var(--sacw-window-bg);
    }

    /* ── Loading state ── */
    .sacw-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: var(--sacw-window-bg);
      transition: opacity 0.4s ease;
      z-index: 1;
    }
    .sacw-loading[data-hidden="true"] {
      opacity: 0;
      pointer-events: none;
    }
    .sacw-loading-dots {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sacw-loading-dots span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--sacw-btn-start);
      opacity: 0.3;
      animation: sacw-dot-bounce 1.4s ease-in-out infinite;
    }
    .sacw-loading-dots span:nth-child(2) { animation-delay: 0.16s; }
    .sacw-loading-dots span:nth-child(3) { animation-delay: 0.32s; }
    @keyframes sacw-dot-bounce {
      0%, 80%, 100% { transform: scale(1);   opacity: 0.3; }
      40%           { transform: scale(1.4); opacity: 1; }
    }
    .sacw-loading-text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #9ca3af;
      letter-spacing: 0.02em;
    }

    /* ── Responsive: tablet ── */
    @media (max-width: 1200px) {
      .sacw-launcher { bottom: 24px; right: 24px; }
      .sacw-teaser { bottom: 34px; right: 112px; }
      .sacw-chatbox {
        bottom: 114px;
        right: 24px;
        width: min(500px, calc(100vw - 48px));
        height: min(720px, calc(100vh - 144px));
        height: min(720px, calc(100dvh - 144px));
      }
    }

    /* ── Responsive: mobile ── */
    @media (max-width: 560px) {
      .sacw-launcher { bottom: 16px; right: 16px; width: 64px; height: 64px; }
      .sacw-launcher svg { width: 34px; height: 34px; }
      .sacw-teaser { right: 16px; bottom: 92px; max-width: calc(100vw - 32px); }
      .sacw-chatbox {
        width: calc(100vw - 20px);
        height: calc(100vh - 102px);
        height: calc(100dvh - 102px);
        right: 10px;
        bottom: 84px;
        border-radius: 20px;
      }
      .sacw-header { border-radius: 20px 20px 0 0; }
      .sacw-body { border-radius: 0 0 20px 20px; }
      .sacw-chatbox[data-header="false"] .sacw-body { border-radius: 20px; }
      .sacw-close-floating { top: 8px; right: 8px; width: 38px; height: 38px; }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      .sacw-launcher,
      .sacw-launcher svg,
      .sacw-chatbox,
      .sacw-teaser,
      .sacw-close-floating,
      .sacw-header-btn,
      .sacw-loading {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
      }
      .sacw-launcher::after {
        animation: none;
      }
    }
  `;

    /* ── Build DOM ── */

    // Single container so the whole widget can be found/removed as one node;
    // also carries the CSS custom properties derived from the configuration
    var container = document.createElement('div');
    container.className = 'sacw-root';
    container.style.setProperty('--sacw-btn-start', buttonColor);
    container.style.setProperty('--sacw-btn-mid', mixHex(buttonColor, buttonColorEnd, 0.5));
    container.style.setProperty('--sacw-btn-end', buttonColorEnd);
    container.style.setProperty('--sacw-btn-start-45', hexToRgba(buttonColor, 0.45));
    container.style.setProperty('--sacw-text', textColor);
    container.style.setProperty('--sacw-text-75', hexToRgba(textColor, 0.75));
    container.style.setProperty('--sacw-text-15', hexToRgba(textColor, 0.15));
    container.style.setProperty('--sacw-text-70', hexToRgba(textColor, 0.7));
    container.style.setProperty('--sacw-status', statusDotColor);
    container.style.setProperty('--sacw-status-45', hexToRgba(statusDotColor, 0.45));
    container.style.setProperty('--sacw-status-0', hexToRgba(statusDotColor, 0));
    container.style.setProperty('--sacw-window-bg', windowBg);

    // Render inside a Shadow DOM: host-page CSS (e.g. a university theme's
    // button/svg rules) cannot restyle the widget, and host scripts that
    // rewrite attributes on document-level queries cannot reach its internals.
    // CSS custom properties set on the host element above still pierce through.
    // Ancient browsers without attachShadow fall back to light DOM.
    var mount;
    try {
      mount = container.attachShadow({ mode: 'open' });
    } catch (_) {
      mount = container;
    }

    // Invisible backdrop for click-away-to-close
    var backdrop = document.createElement('div');
    backdrop.className = 'sacw-backdrop';
    backdrop.setAttribute('data-active', 'false');

    // Launcher button
    var launcher = document.createElement('button');
    launcher.className = 'sacw-launcher sacw-launcher--pulse';
    launcher.setAttribute('type', 'button');
    launcher.setAttribute('aria-label', 'Chat öffnen');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('data-open', 'false');
    launcher.setAttribute('data-status', showStatusDot ? 'on' : 'off');
    launcher.innerHTML = ICONS[iconStyle] + LAUNCHER_CLOSE_ICON;

    launcher.addEventListener('animationend', function () {
      launcher.classList.remove('sacw-launcher--pulse');
    });

    // Teaser bubble (only when configured)
    var teaser = null;
    var teaserDismissed = false;
    if (teaserText) {
      teaser = document.createElement('div');
      teaser.className = 'sacw-teaser';
      teaser.setAttribute('aria-hidden', 'true');
      var teaserContent = document.createElement('div');
      teaserContent.className = 'sacw-teaser-content';
      teaserContent.textContent = teaserText;
      teaser.appendChild(teaserContent);
    }

    // Chat window
    var chatbox = document.createElement('div');
    chatbox.className = 'sacw-chatbox';
    chatbox.setAttribute('role', 'dialog');
    chatbox.setAttribute('aria-modal', 'false');
    chatbox.setAttribute('aria-label', headerTitle);
    chatbox.setAttribute('data-open', 'false');
    chatbox.setAttribute('data-header', showHeader ? 'true' : 'false');

    var closeBtn;

    if (showHeader) {
      // Header — single slim bar with: dot · title · [open-in-tab] · [close]
      var header = document.createElement('div');
      header.className = 'sacw-header';

      var dot = document.createElement('span');
      dot.className = 'sacw-header-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.setAttribute('data-hidden', showStatusDot ? 'false' : 'true');

      var titleEl = document.createElement('span');
      titleEl.className = 'sacw-header-title';
      titleEl.textContent = headerTitle;

      // "Open in new tab" icon button
      var newTabBtn = document.createElement('a');
      newTabBtn.className = 'sacw-header-btn';
      newTabBtn.href = finalUrl;
      newTabBtn.target = '_blank';
      newTabBtn.rel = 'noopener noreferrer';
      newTabBtn.setAttribute('aria-label', 'Chat in neuem Tab öffnen');
      newTabBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
        '<polyline points="15 3 21 3 21 9"/>' +
        '<line x1="10" y1="14" x2="21" y2="3"/></svg>';

      // Close button
      closeBtn = document.createElement('button');
      closeBtn.className = 'sacw-header-btn';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Chat schließen');
      closeBtn.innerHTML = CLOSE_X_ICON;

      header.appendChild(dot);
      header.appendChild(titleEl);
      header.appendChild(newTabBtn);
      header.appendChild(closeBtn);
      chatbox.appendChild(header);
    } else {
      // Headerless mode — floating close button on the window corner
      closeBtn = document.createElement('button');
      closeBtn.className = 'sacw-close-floating';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Chat schließen');
      closeBtn.innerHTML = CLOSE_X_ICON;
      chatbox.appendChild(closeBtn);
    }

    // Body with loading spinner + iframe
    var body = document.createElement('div');
    body.className = 'sacw-body';

    var loading = document.createElement('div');
    loading.className = 'sacw-loading';
    loading.setAttribute('data-hidden', 'false');
    loading.innerHTML =
      '<div class="sacw-loading-dots">' +
      '<span></span><span></span><span></span>' +
      '</div>' +
      '<span class="sacw-loading-text">Wird geladen…</span>';

    var iframe = document.createElement('iframe');
    iframe.setAttribute('title', headerTitle);
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', 'clipboard-write');
    var iframeLoaded = false;

    body.appendChild(loading);
    body.appendChild(iframe);
    chatbox.appendChild(body);

    mount.appendChild(style);
    mount.appendChild(backdrop);
    mount.appendChild(chatbox);
    if (teaser) mount.appendChild(teaser);
    mount.appendChild(launcher);
    document.body.appendChild(container);

    /* ── State management ── */
    var isOpen = false;

    function hideTeaser() {
      if (!teaser || teaserDismissed) return;
      teaserDismissed = true;
      teaser.setAttribute('data-visible', 'false');
      setTimeout(function () { teaser.style.display = 'none'; }, 250);
    }

    function openChat() {
      if (isOpen) return;
      isOpen = true;

      hideTeaser();

      // Lazy-load iframe on first open
      if (!iframeLoaded) {
        iframeLoaded = true;
        loading.setAttribute('data-hidden', 'false'); // ensure overlay is visible
        iframe.addEventListener('load', function onIframeLoad() {
          iframe.removeEventListener('load', onIframeLoad);
          // Delay hiding so SPA (React/Vue/etc.) has time to render before we reveal it
          setTimeout(function () {
            loading.setAttribute('data-hidden', 'true');
          }, 600);
        });
        iframe.src = finalUrl;
      }

      chatbox.setAttribute('data-open', 'true');
      launcher.setAttribute('aria-expanded', 'true');
      launcher.setAttribute('data-open', 'true');
      backdrop.setAttribute('data-active', 'true');

      // Focus the close button for keyboard users
      requestAnimationFrame(function () { closeBtn.focus(); });
    }

    function closeChat() {
      if (!isOpen) return;
      isOpen = false;

      chatbox.setAttribute('data-open', 'false');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.setAttribute('data-open', 'false');
      backdrop.setAttribute('data-active', 'false');

      launcher.focus();
    }

    function toggleChat() {
      isOpen ? closeChat() : openChat();
    }

    /* ── Event listeners ── */
    launcher.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', closeChat);
    backdrop.addEventListener('click', closeChat);
    if (teaser) {
      teaser.addEventListener('click', openChat);
      // Slide the teaser in shortly after page load
      setTimeout(function () {
        if (teaserDismissed) return;
        teaser.style.display = 'block';
        requestAnimationFrame(function () {
          teaser.setAttribute('data-visible', 'true');
        });
      }, 900);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeChat();
      }
    });

    // Expose API for external use
    window.studiAssistChatbot = { open: openChat, close: closeChat, toggle: toggleChat };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
