import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/a889b833-c340-4b5d-8013-cdc017722cee';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('1. Capturing disciplinas landing...');
  await page.goto('http://localhost:5173/#disciplinas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const disciplinasEl = page.locator('#disciplinas');
  if (await disciplinasEl.count() > 0) {
    await disciplinasEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'disciplinas_landing.png'),
      fullPage: false
    });
    console.log('   -> disciplinas_landing.png captured');
  }

  console.log('2. Logging in as admin...');
  await page.goto('http://localhost:5173/login');
  await page.locator('input#email').fill('admin@spartan.dev');
  await page.locator('input[type="password"]').fill('Spartan2026!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  console.log('   -> Logged in successfully, URL:', page.url());

  console.log('3. Capturing predicciones ventas...');
  await page.goto('http://localhost:5173/predicciones', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'predicciones_metricas.png'),
    fullPage: false
  });
  console.log('   -> predicciones_metricas.png captured');

  console.log('4. Capturing admin clientes...');
  await page.goto('http://localhost:5173/admin/clientes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'admin_clientes_directorio.png'),
    fullPage: false
  });
  console.log('   -> admin_clientes_directorio.png captured');

  console.log('5. Capturing prescripcion explicable...');
  // Let's find an active profile or navigate to /prescripcion/259890
  await page.goto('http://localhost:5173/prescripcion/259890', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'prescripcion_natural_cart.png'),
    fullPage: false
  });
  console.log('   -> prescripcion_natural_cart.png captured');

  // Open modal if available
  const modalBtn = page.getByRole('button', { name: /Ver detalle técnico/i });
  if (await modalBtn.count() > 0) {
    await modalBtn.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'prescripcion_modal_tecnico.png'),
      fullPage: false
    });
    console.log('   -> prescripcion_modal_tecnico.png captured');
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
