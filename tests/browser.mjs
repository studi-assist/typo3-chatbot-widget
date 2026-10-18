// Dependency-free browser regression suite. Requires the demo server and a
// disposable Chrome instance with --remote-debugging-port=9223 (see README).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const demoURL = process.env.DEMO_URL || 'http://localhost:8000/demo.html';
const baseURL = new URL('.', demoURL).href;
const cdpURL = process.env.CDP_URL || 'http://127.0.0.1:9223';
const baseline = execFileSync('git', ['show', `${process.env.BASELINE_REF || '53c8f5f'}:Resources/Public/JavaScript/widget-loader.js`], { encoding: 'utf8' });
const loader = readFileSync(new URL('../Resources/Public/JavaScript/widget-loader.js', import.meta.url), 'utf8');
const target = await (await fetch(`${cdpURL}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map();
const exceptions = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
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
  await evaluate(`new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (${expression}) { clearInterval(timer); resolve(true); }
      else if (Date.now() - start > 6000) { clearInterval(timer); reject(new Error('Widget condition timed out')); }
    }, 25);
  })`);
}
async function navigate(path = 'demo/mock-chat.html') {
  await command('Page.navigate', { url: new URL(path, baseURL).href });
  await until('document.readyState === "complete"');
}
async function viewport(width, height) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
}
async function mount(config = {}, source = loader) {
  await navigate();
  await evaluate(`document.body.innerHTML = '<div class="studi-assist-chatbot-root"></div>';
    window.fetch = async () => ({ ok: true, json: async () => ({ available: true }) });
    const root = document.querySelector('.studi-assist-chatbot-root');
    const config = ${JSON.stringify({ chatbotUrl: new URL('demo/mock-chat.html', baseURL).href, ...config })};
    Object.entries(config).forEach(([name,value]) => root.setAttribute('data-' + name.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), value));`);
  if (source === loader) {
    // Use a real script include so shipped image paths resolve just as in TYPO3.
    await evaluate(`new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = ${JSON.stringify(new URL('Resources/Public/JavaScript/widget-loader.js', baseURL).href)};
      script.onload = resolve; script.onerror = reject;
      document.head.appendChild(script);
    })`);
  } else {
    await evaluate(source);
  }
  await until('window.studiAssistChatbot');
  await evaluate('window.studiAssistChatbot.open()');
  await until(`document.querySelector('.sacw-root').shadowRoot.querySelector('.sacw-chatbox').getAnimations().every(a => a.playState === 'finished')`);
}
const scope = `document.querySelector('.sacw-root').shadowRoot`;
async function metrics() {
  return evaluate(`(() => {
    const scope = ${scope};
    const selectors = ['.sacw-chatbox','.sacw-header','.sacw-header-title','.sacw-body','.sacw-launcher','.sacw-launcher svg','.sacw-header-btn','.sacw-header-btn svg','.sacw-close-floating','.sacw-close-floating svg'];
    const props = ['width','height','borderRadius','borderColor','borderWidth','borderStyle','backgroundColor','color','fontSize'];
    return Object.fromEntries(selectors.map(selector => {
      const element = scope.querySelector(selector);
      const style = element && getComputedStyle(element);
      return [selector, style ? Object.fromEntries(props.map(p => [p, style[p]])) : null];
    }));
  })()`);
}
async function change(values) {
  await evaluate(`(() => {
    window.__previousDemoHost = document.querySelector('.sacw-root');
    Object.entries(${JSON.stringify(values)}).forEach(([id,value]) => {
      const input = document.getElementById(id);
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  })()`);
  await until(`document.querySelector('.sacw-root') && document.querySelector('.sacw-root') !== window.__previousDemoHost && window.studiAssistChatbot`);
}
async function preset(name) {
  await evaluate(`window.__previousDemoHost = document.querySelector('.sacw-root'); document.querySelector('[data-preset="${name}"]').click()`);
  await until(`document.querySelector('.sacw-root') !== window.__previousDemoHost && window.studiAssistChatbot`);
}
const pass = message => console.log(`PASS: ${message}`);
try {
  await command('Runtime.enable');
  await command('Page.enable');
  // Compare all legacy visual defaults, allowing only the requested desktop width change.
  for (const [width,height] of [[1440,1100],[1024,1000],[390,844]]) {
    for (const showHeader of ['1','0']) {
      await viewport(width,height);
      const expectedLoader = baseline.replace('width: min(560px,', 'width: min(600px,');
      await mount({ showHeader }, expectedLoader);
      const expected = await metrics();
      await mount({ showHeader });
      assert.deepEqual(await metrics(), expected, `Legacy rendering at ${width}px, header ${showHeader}`);
    }
  }
  pass('600px desktop default; other legacy desktop/tablet/mobile styles and headerless mode preserved');

  await viewport(1600,1200);
  const custom = { windowWidth:'800px', windowHeight:'900px', borderRadius:'16px', borderColor:'#003865', borderWidth:'2px', borderStyle:'dashed', headerHeight:'72px', headerFontSize:'18px', iconColor:'#ffcc00', launcherIconSize:'42px', headerIconSize:'24px' };
  await mount(custom);
  const styles = await metrics();
  assert.equal(styles['.sacw-chatbox'].width, '800px');
  assert.equal(styles['.sacw-chatbox'].height, '900px');
  assert.equal(styles['.sacw-chatbox'].borderRadius, '16px');
  assert.equal(styles['.sacw-body'].borderRadius, '0px 0px 14px 14px');
  assert.equal(styles['.sacw-chatbox'].borderColor, 'rgb(0, 56, 101)');
  assert.equal(styles['.sacw-chatbox'].borderWidth, '2px');
  assert.equal(styles['.sacw-chatbox'].borderStyle, 'dashed');
  assert.equal(styles['.sacw-header'].height, '72px');
  assert.equal(styles['.sacw-header-title'].fontSize, '18px');
  assert.equal(styles['.sacw-header-btn svg'].width, '24px');
  assert.equal(styles['.sacw-launcher svg'].color, 'rgb(255, 204, 0)');
  assert.equal(styles['.sacw-header-btn'].color, 'rgb(255, 204, 0)');
  // Unitless zero is valid, and invalid values must not enter CSS or markup.
  await mount({ borderWidth:'0', borderRadius:'0', windowWidth:'800' });
  assert.equal((await metrics())['.sacw-chatbox'].borderWidth, '0px');
  assert.equal((await metrics())['.sacw-chatbox'].borderRadius, '0px');
  await mount({ windowWidth:'calc(100vw)', windowHeight:'9000px', borderRadius:'-1', borderColor:'red;display:none', borderWidth:'99px', borderStyle:'url(evil)', headerHeight:'0', headerFontSize:'200px', iconColor:'var(--evil)', launcherIconSize:'100px', headerIconSize:'0', iconStyle:'__proto__', closeIcon:'<svg onload="alert(1)">', newTabIcon:'constructor' });
  const fallback = await metrics();
  await mount();
  assert.deepEqual(fallback, await metrics());
  pass('all appearance CSS values, zero values and hostile/out-of-range fallbacks');

  for (const showHeader of ['1','0']) {
    for (const closeIcon of ['x','minus','chevron-down']) {
      for (const newTabIcon of ['external-link','arrow-up-right']) {
        await mount({ showHeader, closeIcon, newTabIcon, headerIconSize:'24px', iconColor:'#fff' });
        const svg = await evaluate(`(() => {
          const s=${scope};
          return { close:s.querySelector('button[aria-label="Close chat"] svg').innerHTML, link:s.querySelector('a svg').innerHTML, color:getComputedStyle(s.querySelector('a')).color, size:getComputedStyle(s.querySelector('a svg')).width, target:s.querySelector('a').target, rel:s.querySelector('a').rel };
        })()`);
        assert.ok(closeIcon === 'x' ? svg.close.includes('<line') : svg.close.includes(closeIcon === 'minus' ? 'M6 12h12' : 'm6 9 6 6 6-6'));
        assert.ok(svg.link.includes(newTabIcon === 'external-link' ? 'polyline' : 'M7 17 17 7'));
        assert.equal(svg.size,'24px');
        assert.equal(svg.color,'rgb(255, 255, 255)');
        assert.equal(svg.target,'_blank');
        assert.equal(svg.rel,'noopener noreferrer');
        await evaluate(`${scope}.querySelector('button[aria-label="Close chat"]').click()`);
        assert.equal(await evaluate(`${scope}.querySelector('.sacw-chatbox').dataset.open`),'false');
        await evaluate(`${scope}.querySelector('.sacw-launcher').click()`);
        assert.equal(await evaluate(`${scope}.querySelector('.sacw-chatbox').dataset.open`),'true');
      }
    }
  }
  pass('all close/new-tab icon combinations in header and headerless mode, open/close controls');
  for (const iconStyle of ['chat','sparkle','cap','robot']) {
    await mount({iconStyle});
    assert.ok(await evaluate(`${scope}.querySelector('.sacw-icon-main').children.length > 0`));
  }
  const iconFile = name => new URL(`Resources/Public/Icons/${name}.svg`,baseURL).href;
  for (const showHeader of ['1','0']) {
    for (const width of [390,1440]) {
      await viewport(width,1100);
      await mount({iconStyle:'arrow-up',closeIcon:'close-thin',newTabIcon:'external-link-double',showHeader,launcherIconSize:'40px',headerIconSize:'24px'});
      await until(`Array.from(${scope}.querySelectorAll('img')).length === 4 && Array.from(${scope}.querySelectorAll('img')).every(img => img.complete && img.naturalWidth > 0 && !img.hidden)`);
      const images = await evaluate(`Array.from(${scope}.querySelectorAll('img')).map(img => ({src:img.src,width:getComputedStyle(img).width,alt:img.alt,referrerPolicy:img.referrerPolicy,fit:getComputedStyle(img).objectFit}))`);
      assert.deepEqual(images.map(img=>img.src).sort(),[iconFile('external-link-double'),iconFile('close-thin'),iconFile('close-thin'),iconFile('arrow-up')].sort());
      for (const img of images) { assert.equal(img.alt,''); assert.equal(img.referrerPolicy,'no-referrer'); assert.equal(img.fit,'contain'); }
      assert.equal(await evaluate(`getComputedStyle(${scope}.querySelector('.sacw-launcher img')).width`),'40px');
      assert.equal(await evaluate(`getComputedStyle(${scope}.querySelector('a img')).width`),'24px');
      await evaluate(`${scope}.querySelector('button[aria-label="Close chat"]').click()`);
      assert.equal(await evaluate(`${scope}.querySelector('.sacw-chatbox').dataset.open`),'false');
    }
  }
  await viewport(1440,1100);
  // TYPO3's explicit resource URL must work when no original script URL exists
  // (for example when the loader is concatenated into a generated script).
  await mount({iconStyle:'arrow-up',closeIcon:'close-thin',newTabIcon:'external-link-double',iconResourceUrl:iconFile('arrow-up')}, loader + '\n// simulated merged loader');
  await until(`Array.from(${scope}.querySelectorAll('img')).length === 4 && Array.from(${scope}.querySelectorAll('img')).every(img => img.complete && img.naturalWidth > 0)`);
  await mount({iconStyle:'unima-03',closeIcon:'unima-02',newTabIcon:'unima-01',showHeader:'0'});
  await until(`Array.from(${scope}.querySelectorAll('img')).length === 4 && Array.from(${scope}.querySelectorAll('img')).every(img => img.complete && img.naturalWidth > 0)`);
  assert.equal(await evaluate(`${scope}.querySelector('.sacw-launcher img.sacw-icon-main').src`),iconFile('arrow-up'));
  assert.equal(await evaluate(`${scope}.querySelector('a img').src`),iconFile('external-link-double'));
  assert.equal(await evaluate(`${scope}.querySelector('button.sacw-close-floating img').src`),iconFile('close-thin'));
  await mount({launcherIconUrl:iconFile('external-link-double'),closeIconUrl:iconFile('arrow-up'),newTabIconUrl:iconFile('close-thin'),showHeader:'0'});
  await until(`Array.from(${scope}.querySelectorAll('img')).length === 4 && Array.from(${scope}.querySelectorAll('img')).every(img => img.complete && img.naturalWidth > 0)`);
  assert.equal(await evaluate(`${scope}.querySelector('.sacw-launcher img.sacw-icon-main').src`),iconFile('external-link-double'));
  assert.equal(await evaluate(`${scope}.querySelector('a img').src`),iconFile('close-thin'));
  assert.equal(await evaluate(`${scope}.querySelector('button.sacw-close-floating img').src`),iconFile('arrow-up'));
  // Non-image, missing and forbidden URLs must retain the built-in icon.
  await mount({launcherIconUrl:new URL('missing-icon.svg',baseURL).href,closeIconUrl:'javascript:alert(1)',newTabIconUrl:'data:image/svg+xml,<svg onload="alert(1)"/>'});
  await until(`${scope}.querySelectorAll('img').length === 0`);
  assert.notEqual(await evaluate(`getComputedStyle(${scope}.querySelector('.sacw-launcher svg')).display`),'none');
  assert.equal(await evaluate('window.__injected'),undefined);
  await mount({launcherIconUrl:new URL('demo/mock-chat.html',baseURL).href});
  await until(`${scope}.querySelectorAll('img').length === 0`);
  assert.notEqual(await evaluate(`getComputedStyle(${scope}.querySelector('.sacw-launcher svg')).display`),'none');
  // Cross-origin image files obey consent, even before the chat is opened.
  const externalIcons = ['launcherIconUrl','closeIconUrl','newTabIconUrl'];
  await evaluate('sessionStorage.removeItem("studiAssistChatbotConsent")');
  await mount(Object.fromEntries([['requireConsent','1'],...externalIcons.map(name=>[name,'http://127.0.0.1:' + new URL(baseURL).port + '/Resources/Public/Icons/arrow-up.svg'])]));
  assert.equal(await evaluate(`Array.from(${scope}.querySelectorAll('img')).every(img => !img.hasAttribute('src'))`),true);
  await evaluate(`${scope}.querySelector('.sacw-consent-btn').click()`);
  await until(`Array.from(${scope}.querySelectorAll('img')).every(img => img.complete && img.naturalWidth > 0)`);
  assert.equal(await evaluate(`Array.from(${scope}.querySelectorAll('img')).every(img => img.hasAttribute('src'))`),true);
  pass('all three generic icon files and custom image URLs, mobile/headerless controls, failure fallbacks and external-image consent');
  await evaluate('sessionStorage.removeItem("studiAssistChatbotConsent")');

  for (const width of [320,390,560,561,1024,1440]) {
    await viewport(width,844);
    await mount({...custom,windowWidth:'2000px',windowHeight:'2000px',borderWidth:'12px',showHeader:'0',newTabIcon:'arrow-up-right'});
    const rects = await evaluate(`Array.from(${scope}.querySelectorAll('.sacw-chatbox, .sacw-close-floating')).map(el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; })`);
    for (const rect of rects) { assert.ok(rect.left>=0 && rect.right<=width,JSON.stringify({width,rect})); assert.ok(rect.top>=0 && rect.bottom<=844,JSON.stringify(rect)); }
    assert.equal((await metrics())['.sacw-chatbox'].borderRadius,'16px');
  }
  pass('responsive geometry and radius with maximum sizes/borders, launcher icon variants');

  await viewport(1440,1100);
  await mount({requireConsent:'1',showHeader:'0',newTabIcon:'external-link'});
  assert.equal(await evaluate(`${scope}.querySelector('iframe').hasAttribute('src')`),false);
  assert.equal(await evaluate(`${scope}.querySelector('a').hidden`),true);
  await evaluate(`${scope}.querySelector('.sacw-consent-btn').click()`);
  assert.equal(await evaluate(`${scope}.querySelector('a').hidden`),false);
  assert.ok(await evaluate(`${scope}.querySelector('iframe').src.includes('mock-chat.html')`));
  pass('headerless new-tab link respects two-click consent');

  await navigate('demo.html');
  await until('window.studiAssistChatbot');
  for (const name of ['hhn','sa','defaults']) {
    await preset(name);
    const m=await metrics();
    assert.equal(m['.sacw-chatbox'].width,'600px');
    assert.equal(m['.sacw-header'].height,'52px');
    assert.equal(await evaluate(`document.getElementById('windowWidth').value`),'');
  }
  await preset('mannheim');
  let m=await metrics();
  assert.equal(m['.sacw-chatbox'].width,'800px');
  assert.equal(m['.sacw-chatbox'].height,'900px');
  assert.equal(m['.sacw-header'].height,'72px');
  assert.equal(m['.sacw-chatbox'].borderStyle,'solid');
  assert.equal(await evaluate(`${scope}.querySelector('.sacw-header-title').textContent`),'Deine KI-Studienberatung');
  assert.equal(await evaluate(`${scope}.querySelector('.sacw-launcher').dataset.status`),'off');
  const output=await evaluate(`document.getElementById('typoscript').value`);
  for (const [name,value] of Object.entries({...custom,borderStyle:'solid',iconColor:'#ffffff',closeIcon:'close-thin',newTabIcon:'external-link-double'})) assert.ok(output.includes(`  ${name} = ${value}`),name);
  assert.ok(!output.includes('mock-chat.html'));
  assert.ok(output.includes('  iconStyle = arrow-up'));
  await change({launcherIconUrl:iconFile('external-link-double'),closeIconUrl:iconFile('arrow-up'),newTabIconUrl:iconFile('close-thin')});
  await until(`Array.from(${scope}.querySelectorAll('img')).every(img => img.complete && img.naturalWidth > 0)`);
  const imageOutput = await evaluate(`document.getElementById('typoscript').value`);
  assert.ok(imageOutput.includes('  launcherIconUrl = ' + iconFile('external-link-double')));
  assert.ok(imageOutput.includes('  closeIconUrl = ' + iconFile('arrow-up')));
  assert.ok(imageOutput.includes('  newTabIconUrl = ' + iconFile('close-thin')));
  await change({launcherIconUrl:'',closeIconUrl:'',newTabIconUrl:''});
  await evaluate('window.studiAssistChatbot.open()');
  await change({ windowWidth:'700px',windowHeight:'800px',borderRadius:'8px',borderColor:'#ff0000',borderWidth:'4px',borderStyle:'dotted',headerHeight:'64px',headerFontSize:'20px',iconColor:'#00ff00',closeIcon:'minus',newTabIcon:'arrow-up-right',launcherIconSize:'40px',headerIconSize:'20px' });
  await until(`${scope}.querySelector('.sacw-chatbox').dataset.open === 'true'`);
  m=await metrics();
  assert.equal(m['.sacw-chatbox'].width,'700px');
  assert.equal(m['.sacw-chatbox'].height,'800px');
  assert.equal(m['.sacw-chatbox'].borderRadius,'8px');
  assert.equal(m['.sacw-chatbox'].borderColor,'rgb(255, 0, 0)');
  assert.equal(m['.sacw-chatbox'].borderWidth,'4px');
  assert.equal(m['.sacw-chatbox'].borderStyle,'dotted');
  assert.equal(m['.sacw-header'].height,'64px');
  assert.equal(m['.sacw-header-title'].fontSize,'20px');
  assert.equal(m['.sacw-launcher svg'].width,'40px');
  assert.equal(m['.sacw-header-btn svg'].width,'20px');
  await preset('defaults');
  assert.equal((await metrics())['.sacw-chatbox'].borderRadius,'24px');
  await change({mockMode:false,chatbotUrl:new URL('demo/mock-chat.html',baseURL).href});
  await change({mockMode:true});
  await evaluate(`for (let i=0;i<10;i++) document.querySelector('[data-preset="' + (i%2 ? 'mannheim':'defaults') + '"]').click()`);
  await until('window.studiAssistChatbot');
  assert.equal(await evaluate(`document.querySelectorAll('.sacw-root').length`),1);
  assert.equal((await metrics())['.sacw-chatbox'].width,'800px');
  pass('existing and Mannheim presets, every live control, TypoScript export, mock toggle and rapid rebuilds');
  await evaluate('window.studiAssistChatbot.open()');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await until(`${scope}.querySelector('.sacw-loading').dataset.hidden === 'true'`);
  const shot=await command('Page.captureScreenshot',{format:'png'});
  if (process.env.SCREENSHOT_PATH) writeFileSync(process.env.SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
  assert.deepEqual(exceptions,[]);
  pass('no browser JavaScript exceptions');
} finally {
  ws.close();
  await fetch(`${cdpURL}/json/close/${target.id}`);
}
