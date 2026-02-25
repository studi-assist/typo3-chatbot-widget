(function () {
  const root = document.querySelector('.studi-assist-chatbot-root');
  if (!root) return;

  const chatbotUrl = root.getAttribute('data-chatbot-url');
  if (!chatbotUrl) return;

  // Avoid double-init if plugin appears multiple times
  if (window.__studiAssistChatbotWidgetInitialized) return;
  window.__studiAssistChatbotWidgetInitialized = true;

  // Button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open chatbot');
  btn.style.position = 'fixed';
  btn.style.right = '20px';
  btn.style.bottom = '20px';
  btn.style.width = '56px';
  btn.style.height = '56px';
  btn.style.borderRadius = '999px';
  btn.style.border = 'none';
  btn.style.cursor = 'pointer';
  btn.style.zIndex = '999999';
  btn.textContent = '💬';

  // Overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.right = '20px';
  overlay.style.bottom = '90px';
  overlay.style.width = '380px';
  overlay.style.height = '560px';
  overlay.style.background = '#fff';
  overlay.style.borderRadius = '16px';
  overlay.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'none';
  overlay.style.overflow = 'hidden';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '10px 12px';
  header.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
  header.textContent = 'Chatbot';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close chatbot');
  closeBtn.textContent = '✕';
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'transparent';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '16px';

  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.style.width = '100%';
  body.style.height = 'calc(100% - 44px)';

  let iframe;

  function open() {
    overlay.style.display = 'block';

    // Lazy-load iframe on first open
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.src = chatbotUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.setAttribute('title', 'Chatbot');

      // Basic fallback after a bit: show link if iframe likely blocked
      const fallbackTimer = window.setTimeout(() => {
        if (!iframe || !overlay.isConnected) return;
        // If it's blocked, users typically see a browser error in frame;
        // Provide a "new tab" link anyway.
        if (!body.querySelector('a')) {
          const link = document.createElement('a');
          link.href = chatbotUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Open chatbot in a new tab';
          link.style.display = 'block';
          link.style.padding = '10px 12px';
          link.style.fontFamily = 'sans-serif';
          link.style.fontSize = '14px';
          body.appendChild(link);
        }
      }, 4000);

      iframe.addEventListener('load', () => window.clearTimeout(fallbackTimer));
      body.appendChild(iframe);
    }
  }

  function close() {
    overlay.style.display = 'none';
  }

  btn.addEventListener('click', () => {
    if (overlay.style.display === 'none') open();
    else close();
  });

  closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  overlay.appendChild(header);
  overlay.appendChild(body);
  document.body.appendChild(btn);
  document.body.appendChild(overlay);
})();