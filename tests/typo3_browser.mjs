// Integration smoke test for the local TYPO3 installation in dev/typo3/.
// Start it and a disposable Chrome with DevTools on port 9223 first.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const site = process.env.TYPO3_URL || 'http://localhost:8081/';
const cdp = process.env.CDP_URL || 'http://127.0.0.1:9223';
const target = await (await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map();
const errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  const task = pending.get(message.id);
  if (!task) return;
  pending.delete(message.id);
  clearTimeout(task.timer);
  if (message.error) task.reject(new Error(JSON.stringify(message.error)));
  else task.resolve(message.result);
};
function command(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(`Boolean(${expression})`)) return;
    } catch (error) {
      if (!/Inspected target navigated|Cannot find context|Execution context destroyed/.test(String(error))) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`TYPO3 widget condition timed out: ${expression}`);
}
try {
  await command('Runtime.enable');
  await command('Page.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url: site });
  await until('document.readyState === "complete" && window.studiAssistChatbot && document.querySelector(".sacw-root")');
  const initial = await evaluate(`(() => {
    const root = document.querySelector('.studi-assist-chatbot-root');
    const widget = document.querySelector('.sacw-root').shadowRoot;
    return {
      title: document.title,
      url: root.dataset.chatbotUrl,
      iconStyle: root.dataset.iconStyle,
      closeIcon: root.dataset.closeIcon,
      newTabIcon: root.dataset.newTabIcon,
      asset: root.dataset.iconResourceUrl,
      script: [...document.scripts].some(s => s.src.includes('/_assets/') && s.src.includes('widget-loader.js')),
      launcherVisible: getComputedStyle(widget.querySelector('.sacw-launcher')).display !== 'none'
    };
  })()`);
  assert.equal(initial.url, 'https://website.studi-assist.de/chat/public/de');
  assert.equal(initial.iconStyle, 'arrow-up');
  assert.equal(initial.closeIcon, 'close-thin');
  assert.equal(initial.newTabIcon, 'external-link-double');
  assert.match(initial.asset, /^\/_assets\/.*\/Icons\/arrow-up\.svg/);
  assert.ok(initial.script && initial.launcherVisible, JSON.stringify(initial));

  await evaluate('window.studiAssistChatbot.open()');
  await until(`document.querySelector('.sacw-root').shadowRoot.querySelector('.sacw-chatbox').dataset.open === 'true'`);
  await until(`(() => { const images = document.querySelector('.sacw-root').shadowRoot.querySelectorAll('img'); return images.length >= 3 && [...images].every(i => i.complete && i.naturalWidth > 0); })()`);
  const opened = await evaluate(`(() => {
    const widget = document.querySelector('.sacw-root').shadowRoot;
    const box = widget.querySelector('.sacw-chatbox');
    return {
      width: getComputedStyle(box).width,
      iframe: widget.querySelector('iframe')?.src,
      images: [...widget.querySelectorAll('img')].map(i => i.getAttribute('src'))
    };
  })()`);
  assert.equal(opened.width, '600px');
  assert.equal(opened.iframe, initial.url);
  assert.ok(opened.images.some(url => url.endsWith('/Icons/arrow-up.svg')));
  assert.ok(opened.images.some(url => url.endsWith('/Icons/close-thin.svg')));
  assert.ok(opened.images.some(url => url.endsWith('/Icons/external-link-double.svg')));
  assert.deepEqual(errors, []);

  if (process.env.SCREENSHOT_PATH) {
    await evaluate('new Promise(resolve => setTimeout(resolve, 2500))');
    const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(process.env.SCREENSHOT_PATH, Buffer.from(shot.data, 'base64'));
  }
  console.log('PASS: TYPO3 rendered the plugin, shipped assets, live iframe, icons and 600px window');

  await command('Page.navigate', { url: new URL('global', site).href });
  await until('document.readyState === "complete" && window.studiAssistChatbot && document.querySelector(".sacw-root")');
  const global = await evaluate(`(() => {
    const roots = document.querySelectorAll('.studi-assist-chatbot-root');
    return {
      count: roots.length,
      url: roots[0]?.dataset.chatbotUrl,
      iconAsset: roots[0]?.dataset.iconResourceUrl,
      ownIcon: roots[0]?.dataset.launcherIconUrl,
      loaderCount: [...document.scripts].filter(s => s.src.includes('widget-loader.js')).length
    };
  })()`);
  assert.equal(global.count, 1);
  assert.equal(global.url, initial.url);
  assert.match(global.iconAsset, /^\/_assets\/.*\/Icons\/arrow-up\.svg/);
  assert.equal(global.ownIcon, '/fileadmin/icons/preview-arrow.svg');
  assert.equal(global.loaderCount, 1);
  await until(`(() => { const image = document.querySelector('.sacw-root').shadowRoot.querySelector('.sacw-launcher img'); return image && image.complete && image.naturalWidth > 0; })()`);
  assert.deepEqual(errors, []);
  console.log('PASS: TYPO3 also rendered the global TypoScript widget and public fileadmin icon on /global');

  const password = readFileSync(new URL('../dev/typo3/app/.local-admin-password', import.meta.url), 'utf8').trim();
  await command('Network.clearBrowserCookies');
  await command('Page.navigate', { url: new URL('typo3/', site).href });
  await until('document.readyState === "complete" && document.querySelector("#t3-username")');
  await evaluate(`(() => {
    const username = document.querySelector('#t3-username');
    const password = document.querySelector('#t3-password');
    username.value = 'admin';
    password.value = ${JSON.stringify(password)};
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#t3-login-submit').click();
  })()`);
  await until('document.readyState === "complete" && !document.querySelector("#t3-username")');
  assert.match(await evaluate('document.title'), /TYPO3/i);
  console.log('PASS: TYPO3 backend administrator login works');
} finally {
  ws.close();
  await fetch(`${cdp}/json/close/${target.id}`);
}
