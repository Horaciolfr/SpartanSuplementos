const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/a889b833-c340-4b5d-8013-cdc017722cee';

async function main() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log('Logging in with real admin credentials...');
  await page.goto('http://127.0.0.1:5173/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input#email').fill('admin@spartan.dev');
  await page.locator('input[type="password"]').fill('SpartanAdmin2026!');
  await page.locator('button[type="submit"]').click();

  // Wait for login redirection
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  console.log('Logged in successfully. Current URL:', page.url());

  // 1. Capture /predicciones in Light Mode
  console.log('1. Navigating to /predicciones in Light Mode...');
  await page.evaluate(() => {
    localStorage.setItem('spartan_theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
  });

  await page.goto('http://127.0.0.1:5173/predicciones');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Re-verify light class applied
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(500);

  const predShotPath = path.join(ARTIFACTS_DIR, 'screenshot_predicciones_light.png');
  await page.screenshot({ path: predShotPath, fullPage: false });
  console.log('Saved:', predShotPath);

  // 2. Capture /pos showing customer selection
  console.log('2. Navigating to /pos...');
  await page.goto('http://127.0.0.1:5173/pos');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const posShotPath = path.join(ARTIFACTS_DIR, 'screenshot_pos_cliente_dinamico.png');
  await page.screenshot({ path: posShotPath, fullPage: false });
  console.log('Saved:', posShotPath);

  // 3. Capture /biometria showing single header
  console.log('3. Navigating to /biometria...');
  await page.goto('http://127.0.0.1:5173/biometria');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const bioShotPath = path.join(ARTIFACTS_DIR, 'screenshot_biometria_single_header.png');
  await page.screenshot({ path: bioShotPath, fullPage: false });
  console.log('Saved:', bioShotPath);

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
