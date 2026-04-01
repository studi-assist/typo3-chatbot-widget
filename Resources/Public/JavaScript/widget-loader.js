(function () {
  'use strict';

  function init() {
    const root = document.querySelector('.studi-assist-chatbot-root');
    if (!root) return;

  const chatbotUrl = root.getAttribute('data-chatbot-url');
  if (!chatbotUrl) return;

  const buttonColor  = root.getAttribute('data-button-color')  || '#779EC4';
  const textColor    = root.getAttribute('data-text-color')    || '#ffffff';
  const headerTitle  = root.getAttribute('data-header-title')  || 'StudiAssist';
  const studyProgram = root.getAttribute('data-study-program') || '';

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

  // Validate color format (hex only)
  if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(buttonColor)) return;

  // Avoid double-init
  if (window.__studiAssistChatbotWidgetInitialized) return;
  window.__studiAssistChatbotWidgetInitialized = true;

  /* ── Helpers ── */
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

  /* ── Inject styles ── */
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
      bottom: 32px;
      right: 32px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: ${buttonColor};
      color: ${textColor};
      box-shadow:
        0 4px 12px ${hexToRgba(buttonColor, 0.4)},
        0 1px 3px rgba(0, 0, 0, 0.12);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  box-shadow 0.3s ease,
                  background 0.2s ease;
    }
    .sacw-launcher:hover {
      transform: scale(1.1);
      box-shadow:
        0 6px 20px ${hexToRgba(buttonColor, 0.5)},
        0 2px 6px rgba(0, 0, 0, 0.15);
      background: ${darkenHex(buttonColor, 15)};
    }
    .sacw-launcher:focus-visible {
      outline: 3px solid ${hexToRgba(buttonColor, 0.5)};
      outline-offset: 4px;
    }
    .sacw-launcher:active {
      transform: scale(0.95);
      transition-duration: 0.1s;
    }

    /* Icon transitions */
    .sacw-launcher svg {
      width: 28px;
      height: 28px;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.2s ease;
      position: absolute;
    }
    .sacw-launcher .sacw-icon-chat {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    .sacw-launcher .sacw-icon-close {
      opacity: 0;
      transform: scale(0.5) rotate(-90deg);
    }
    .sacw-launcher[aria-expanded="true"] .sacw-icon-chat {
      opacity: 0;
      transform: scale(0.5) rotate(90deg);
    }
    .sacw-launcher[aria-expanded="true"] .sacw-icon-close {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }

    /* Hide badge when chat is open */
    .sacw-launcher[aria-expanded="true"] .sacw-launcher-badge {
      display: none;
    }

    /* Online badge */
    .sacw-launcher-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #4ade80;
      border: 2px solid #fff;
      z-index: 1;
    }
    /* Ripple behind the badge */
    .sacw-launcher-badge::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: #4ade80;
      opacity: 0.4;
      animation: sacw-ripple 2s ease-out infinite;
    }
    @keyframes sacw-ripple {
      0%   { transform: scale(1);   opacity: 0.4; }
      100% { transform: scale(2.4); opacity: 0; }
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

    /* ── Chat window ── */
    .sacw-chatbox {
      position: fixed;
      bottom: 108px;
      right: 32px;
      width: 500px;
      height: 720px;
      max-height: calc(100dvh - 120px);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
      box-shadow:
        0 24px 48px rgba(0, 0, 0, 0.16),
        0 8px 16px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(0, 0, 0, 0.04);

      /* Hidden by default */
      opacity: 0;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
      gap: 6px;
      padding: 0 6px 0 14px;
      height: 44px;
      min-height: 44px;
      background: ${buttonColor};
      color: ${textColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .sacw-header-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.25);
    }

    .sacw-header-title {
      font-size: 13px;
      font-weight: 600;
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
      color: ${hexToRgba(textColor, 0.75)};
      width: 30px;
      height: 30px;
      border-radius: 7px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;
      text-decoration: none;
    }
    .sacw-header-btn:hover {
      background: ${hexToRgba(textColor, 0.15)};
      color: ${textColor};
    }
    .sacw-header-btn:active { opacity: 0.7; }
    .sacw-header-btn:focus-visible {
      outline: 2px solid ${hexToRgba(textColor, 0.7)};
      outline-offset: -2px;
    }
    .sacw-header-btn svg {
      width: 14px;
      height: 14px;
    }

    /* ── Iframe body area ── */
    .sacw-body {
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
    }
    .sacw-body iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
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
      background: #f9fafb;
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
      background: ${buttonColor};
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
      .sacw-launcher { bottom: 24px; right: 24px; width: 56px; height: 56px; }
      .sacw-chatbox {
        bottom: 96px;
        right: 24px;
        width: 390px;
        height: 580px;
        max-height: calc(100dvh - 108px);
      }
    }

    /* ── Responsive: mobile → fullscreen ── */
    @media (max-width: 560px) {
      .sacw-launcher { bottom: 16px; right: 16px; width: 52px; height: 52px; }
      .sacw-launcher svg { width: 24px; height: 24px; }
      .sacw-chatbox {
        inset: 0;
        width: 100%;
        height: 100%;
        max-height: 100%;
        border-radius: 0;
        bottom: auto;
        right: auto;
      }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      .sacw-launcher,
      .sacw-launcher svg,
      .sacw-chatbox,
      .sacw-close,
      .sacw-loading {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
      }
    }
  `;
  document.head.appendChild(style);

  /* ── Build DOM ── */

  // Invisible backdrop for click-away-to-close
  var backdrop = document.createElement('div');
  backdrop.className = 'sacw-backdrop';
  backdrop.setAttribute('data-active', 'false');

  // Launcher button
  var launcher = document.createElement('button');
  launcher.className = 'sacw-launcher sacw-launcher--pulse';
  launcher.setAttribute('type', 'button');
  launcher.setAttribute('aria-label', 'Chat \u00f6ffnen');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML =
    '<svg class="sacw-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
    ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7' +
    ' 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8' +
    ' 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48' +
    ' 0 0 1 8 8v.5z"/></svg>' +
    '<svg class="sacw-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
    ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<line x1="18" y1="6" x2="6" y2="18"/>' +
    '<line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '<span class="sacw-launcher-badge" aria-hidden="true"></span>';

  // Badge disappears while chat is open (not needed when X is shown)
  launcher.addEventListener('animationend', function () {
    launcher.classList.remove('sacw-launcher--pulse');
  });

  // Chat window
  var chatbox = document.createElement('div');
  chatbox.className = 'sacw-chatbox';
  chatbox.setAttribute('role', 'dialog');
  chatbox.setAttribute('aria-modal', 'false');
  chatbox.setAttribute('aria-label', headerTitle);
  chatbox.setAttribute('data-open', 'false');

  // Header — single slim bar with: dot · title · [open-in-tab] · [close]
  var header = document.createElement('div');
  header.className = 'sacw-header';

  var dot = document.createElement('span');
  dot.className = 'sacw-header-dot';
  dot.setAttribute('aria-hidden', 'true');

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
  var closeBtn = document.createElement('button');
  closeBtn.className = 'sacw-header-btn';
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('aria-label', 'Chat schlie\u00dfen');
  closeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
    ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<line x1="18" y1="6" x2="6" y2="18"/>' +
    '<line x1="6" y1="6" x2="18" y2="18"/></svg>';

  header.appendChild(dot);
  header.appendChild(titleEl);
  header.appendChild(newTabBtn);
  header.appendChild(closeBtn);

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

  chatbox.appendChild(header);
  chatbox.appendChild(body);

  document.body.appendChild(backdrop);
  document.body.appendChild(chatbox);
  document.body.appendChild(launcher);

  /* ── State management ── */
  var isOpen = false;

  function openChat() {
    if (isOpen) return;
    isOpen = true;

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
    backdrop.setAttribute('data-active', 'true');

    // Focus the close button for keyboard users
    requestAnimationFrame(function () { closeBtn.focus(); });
  }

  function closeChat() {
    if (!isOpen) return;
    isOpen = false;

    chatbox.setAttribute('data-open', 'false');
    launcher.setAttribute('aria-expanded', 'false');
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