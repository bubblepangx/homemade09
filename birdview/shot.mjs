import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = '/home/user/homemade09/birdview/renders';
const W = 2000, H = 1400;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.type(), m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto('file:///home/user/homemade09/birdview/index.html');
await page.waitForFunction(() => window.__shot !== undefined, null, { timeout: 60000 });
await page.waitForTimeout(3000);

const keys = ['front', 'back', 'left', 'right', 'top'];
for (const k of keys) {
  const data = await page.evaluate(([key, w, h]) => window.__shot(key, w, h), [k, W, H]);
  const b64 = data.split(',')[1];
  fs.writeFileSync(path.join(OUT, `${k}.jpg`), Buffer.from(b64, 'base64'));
  console.log('saved', k, (Buffer.from(b64, 'base64').length / 1024).toFixed(0) + 'KB');
}
await browser.close();
