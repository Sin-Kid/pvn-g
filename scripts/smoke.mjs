// Browser smoke test: serves site/ with the production headers, opens it in
// Chromium and checks that the interactive parts actually work.
// Locally you can point it at an installed Chrome: CHROME_PATH=/path/to/chrome npm test
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {}
);
const failures = [];
function check(ok, msg, detail = []) {
  if (ok) return console.log(`✓ ${msg}`);
  failures.push(msg);
  console.error(`✗ ${msg}${detail.length ? '\n    ' + detail.join('\n    ') : ''}`);
}

async function open(path, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return { page, errors };
}

{
  const { page, errors } = await open('/', { width: 1280, height: 860 });
  check((await page.locator('.ic').count()) === 5, 'renders 5 project chips');
  check((await page.locator('.net').count()) === 53, 'renders 53 skill nets');
  check((await page.locator('#u1 .m-pin').count()) === 24, 'U1 has 24 pins');
  check((await page.locator('#wires path.w').count()) > 0, 'wires the focused chip to its nets');
  check((await page.locator('#laPlot svg').count()) === 1, 'draws the logic analyzer');
  check((await page.locator('.ic').first().getAttribute('id')) === 'ic-parking', 'the FPGA project comes first');

  const links = await page.$$eval('.ic-link', (as) => as.map((a) => a.href));
  check(links.length === 8 && links.every((h) => h.startsWith('https://')), `every project link is a real https link (${links.length} found)`);
  const certs = await page.$$eval('a.cert', (as) => as.map((a) => a.href));
  check(certs.length === 3 && certs.every((h) => h.startsWith('https://drive.google.com/')), 'all 3 certificates link to their files');

  // previews are lazy-loaded, so bring each one into view before checking it
  const loaded = (sel) => page.$eval(sel, (img) => img.complete && img.naturalWidth > 0).catch(() => false);
  await page.locator('#ic-parking .ic-prev img').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  check(await loaded('#ic-parking .ic-prev img'), 'the open chip shows its preview');
  await page.click('#ic-firefit .ic-head');
  await page.waitForTimeout(800);
  check(await loaded('#ic-firefit .ic-prev img'), 'opening another chip loads its screenshot');

  await page.fill('#termIn', 'net esp32');
  await page.press('#termIn', 'Enter');
  await page.waitForTimeout(500);
  check((await page.locator('#termOut').innerText()).includes('NET ESP32'), 'serial monitor answers commands');
  check((await page.locator('.net[aria-pressed="true"]').count()) === 1, 'a serial command energizes a net');

  await page.click('.mask [data-mask="white"]');
  check((await page.evaluate(() => document.documentElement.dataset.mask)) === 'white', 'solder mask switch works');
  check(errors.length === 0, 'no errors or failed requests on desktop', errors);
  await page.close();
}

{
  const { page, errors } = await open('/', { width: 390, height: 844 });
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  check(width <= 390, `no sideways scrolling at phone width (page is ${width}px wide)`);
  check(errors.length === 0, 'no errors or failed requests on a phone', errors);
  await page.close();
}

{
  const { page, errors } = await open('/no-such-page', { width: 1280, height: 800 });
  check(/open/i.test(await page.locator('h1').innerText()), 'unknown paths get the 404 page');
  const real = errors.filter((e) => !/404/.test(e));
  check(real.length === 0, 'no errors on the 404 page', real);
  await page.close();
}

await browser.close();
server.close();
if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed`);
  process.exit(1);
}
console.log('\nSmoke test passed');
