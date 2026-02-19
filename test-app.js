const WebSocket = require('ws');

const CDP_URL = 'http://localhost:9222';
const APP_URL = 'http://localhost:3000/';

async function getCdpTarget() {
  const resp = await fetch(`${CDP_URL}/json/new?${APP_URL}`, { method: 'PUT' });
  const target = await resp.json();
  return target.webSocketDebuggerUrl;
}

function cdpConnect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res } = pending.get(msg.id);
        pending.delete(msg.id);
        res(msg);
      }
    });

    ws.on('open', () => resolve({
      send(method, params = {}) {
        return new Promise((res) => {
          const msgId = ++id;
          pending.set(msgId, { resolve: res });
          ws.send(JSON.stringify({ id: msgId, method, params }));
        });
      },
      close() { ws.close(); }
    }));
    ws.on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Helper to evaluate JS and return the string value
let debug = false;
async function evaluate(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true
  });
  // CDP result structure can vary
  const val = res?.result?.result?.value ?? res?.result?.value;
  if (val === undefined && debug) {
    console.log('  [CDP debug]', JSON.stringify(res).substring(0, 200));
  }
  return val;
}

async function main() {
  const wsUrl = await getCdpTarget();
  const cdp = await cdpConnect(wsUrl);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // Navigate to the app
  console.log('Navigating to', APP_URL);
  await cdp.send('Page.navigate', { url: APP_URL });
  await sleep(4000);

  // Debug: check what we see
  debug = true;
  const title = await evaluate(cdp, 'document.title');
  debug = false;
  console.log('Page title:', title);

  // Screenshot initial page
  const ss1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('/tmp/screenshot-initial.png', Buffer.from(ss1.result.data, 'base64'));
  console.log('Saved /tmp/screenshot-initial.png');

  // Add third URL input
  await evaluate(cdp, `document.querySelector('#add-url-btn').click(); 'ok'`);
  await sleep(300);

  // Enter URLs
  const urls = [
    'https://cooking.nytimes.com/recipes/1015819-chocolate-chip-cookies',
    'https://www.verybestbaking.com/toll-house/recipes/chocolate-chip-cookies/',
    'https://sallysbakingaddiction.com/chewy-chocolate-chip-cookies/',
  ];
  for (let i = 0; i < urls.length; i++) {
    await evaluate(cdp, `(() => { const el = document.querySelectorAll('.url-input')[${i}]; el.value = '${urls[i]}'; el.dispatchEvent(new Event('input')); return 'ok'; })()`);
  }
  await sleep(300);

  // Screenshot with URLs entered
  const ss1b = await cdp.send('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('/tmp/screenshot-urls.png', Buffer.from(ss1b.result.data, 'base64'));
  console.log('Saved /tmp/screenshot-urls.png');

  // Click Compare
  console.log('Clicking Compare...');
  await evaluate(cdp, `document.querySelector('#compare-btn').click(); 'ok'`);

  // Wait for results
  console.log('Waiting for results...');
  let done = false;
  let lastStatus = '';
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const raw = await evaluate(cdp, `JSON.stringify({
      resultsVisible: !document.querySelector('#results').classList.contains('hidden'),
      statusText: document.querySelector('#status')?.textContent?.trim() || '',
      errorText: document.querySelector('#error')?.classList.contains('hidden') ? '' : (document.querySelector('#error')?.textContent || ''),
    })`);
    if (typeof raw !== 'string') {
      console.log('  (polling: got non-string result, retrying...)', typeof raw, raw);
      continue;
    }
    const state = JSON.parse(raw);
    if (state.statusText && state.statusText !== lastStatus) {
      console.log('  ...', state.statusText);
      lastStatus = state.statusText;
    }
    if (state.errorText) {
      console.log('  ERROR:', state.errorText);
      break;
    }
    if (state.resultsVisible) {
      console.log('  Results loaded!');
      done = true;
      break;
    }
  }

  await sleep(2000);

  // Set large viewport and screenshot
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1400, height: 5000, deviceScaleFactor: 1, mobile: false
  });
  await sleep(1000);

  const ss2 = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  require('fs').writeFileSync('/tmp/screenshot-results.png', Buffer.from(ss2.result.data, 'base64'));
  console.log('Saved /tmp/screenshot-results.png');

  // Extract page data
  if (done) {
    const dataRaw = await evaluate(cdp, `(() => {
      const cards = document.querySelectorAll('#recipe-cards > div');
      const cardData = Array.from(cards).map(c => c.textContent.replace(/\\s+/g, ' ').trim());
      const table = document.querySelector('#comparison-table');
      const rows = table ? Array.from(table.querySelectorAll('tr')).map(r =>
        Array.from(r.querySelectorAll('th,td')).map(c => c.textContent.trim())
      ) : [];
      const insights = document.querySelector('#insights-content')?.textContent?.substring(0, 500) || '';
      return JSON.stringify({ cardData, rows, insights }, null, 2);
    })()`);
    console.log('\n=== PAGE DATA ===');
    console.log(dataRaw);
  }

  cdp.close();
  console.log('\nDone!');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
