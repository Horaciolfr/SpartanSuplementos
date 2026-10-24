const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

const OUTPUT_DIR = path.resolve(__dirname, '../docs/mockups/capturas_reales');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureScreen(page, name, isMobile = false) {
  const prefix = isMobile ? 'movil' : 'web';
  const filePath = path.join(OUTPUT_DIR, `${prefix}_${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`[CAPTURA GUARDADA]: ${prefix}_${name}.png (${isMobile ? '390x844' : '1440x900'})`);
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  // 1. DESKTOP CONTEXT
  console.log('--- INICIANDO CAPTURAS REALES DESKTOP (1440x900) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await desktopContext.newPage();

  // Screen 1: Landing Page & Catálogo
  console.log('Navegando a Landing & Catálogo...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await captureScreen(page, '01_landing_inicio');

  // Scroll to catalog section
  await page.evaluate(() => {
    const el = document.getElementById('catalogo') || document.querySelector('section[id*="catalog"]');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo(0, 950);
  });
  await page.waitForTimeout(1200);
  await captureScreen(page, '01_catalogo_productos');

  // Screen 2: Login Page
  console.log('Navegando a Login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await captureScreen(page, '08_login_autenticacion');

  // Perform Login
  console.log('Autenticando como Administrador...');
  await page.fill('#email', 'admin@spartan.dev');
  await page.fill('#password', 'SpartanAdmin2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // Screen 3: Módulo Biometría IA
  console.log('Navegando a Módulo de Biometría IA...');
  await page.goto('http://localhost:5173/biometria', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click on "Demo" button to trigger real MediaPipe pose analysis
  try {
    const demoBtn = await page.$('button:has-text("Demo"), button[title="Cargar muestra demo"]');
    if (demoBtn) {
      console.log('Pulsando botón Demo para ejecutar inferencia MediaPipe real...');
      await demoBtn.click();
      // Wait for inference and rendering
      await page.waitForTimeout(4000);
    }
  } catch (e) {
    console.warn('Error al activar demo biometría:', e.message);
  }
  await captureScreen(page, '02_biometria_escaner_ia');

  // Tab: Dieta / Nutrición en Biometría
  try {
    const dietaTab = await page.$('button:has-text("Dieta"), button:has-text("Nutrición")');
    if (dietaTab) {
      await dietaTab.click();
      await page.waitForTimeout(1200);
      await captureScreen(page, '03_plan_nutricional_dieta');
    }
    const telemetriaTab = await page.$('button:has-text("Telemetría"), button:has-text("Antropometría")');
    if (telemetriaTab) {
      await telemetriaTab.click();
      await page.waitForTimeout(1000);
      await captureScreen(page, '03_antropometria_telemetria');
    }
  } catch (e) {
    console.warn('Error cambiando tabs de biometría:', e.message);
  }

  // Screen 4: Prescripción
  console.log('Navegando a Prescripción Cross-Selling...');
  await page.goto('http://localhost:5173/prescripcion', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await captureScreen(page, '04_prescripcion_crossselling');

  // Screen 5: Punto de Venta (POS)
  console.log('Navegando a Punto de Venta (POS)...');
  await page.goto('http://localhost:5173/pos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Click on first 2 products to add them to cart and show total
  try {
    const addButtons = await page.$$('button:has-text("Añadir"), div.cursor-pointer[class*="group"], button[title*="Añadir"]');
    if (addButtons.length > 0) {
      await addButtons[0].click();
      await page.waitForTimeout(800);
    }
    if (addButtons.length > 1) {
      await addButtons[1].click();
      await page.waitForTimeout(800);
    }
  } catch (e) {
    console.warn('Error interactuando con productos POS:', e.message);
  }
  await captureScreen(page, '05_pos_caja_ventas');

  // Screen 6: Predicciones de Ventas con IA
  console.log('Navegando a Predicciones de Ventas IA...');
  await page.goto('http://localhost:5173/predicciones', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await captureScreen(page, '06_predicciones_demanda_ia');

  // Screen 7: Admin Clientes
  console.log('Navegando a Administración de Clientes...');
  await page.goto('http://localhost:5173/admin/clientes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await captureScreen(page, '07_admin_clientes');

  await desktopContext.close();

  // 2. MOBILE CONTEXT (iPhone 14 / Modern smartphone - 390x844)
  console.log('\n--- INICIANDO CAPTURAS REALES MÓVIL (390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  // Mobile Screen 1: Landing
  console.log('[Móvil] Navegando a Landing...');
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  await captureScreen(mobilePage, '01_landing_inicio', true);

  // Mobile Screen 2: Login
  console.log('[Móvil] Navegando a Login...');
  await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  await captureScreen(mobilePage, '08_login_autenticacion', true);

  // Authenticate mobile
  console.log('[Móvil] Autenticando...');
  await mobilePage.fill('#email', 'admin@spartan.dev');
  await mobilePage.fill('#password', 'SpartanAdmin2026!');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForTimeout(2500);

  // Mobile Screen 3: Biometría IA
  console.log('[Móvil] Navegando a Biometría...');
  await mobilePage.goto('http://localhost:5173/biometria', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  try {
    const demoBtn = await mobilePage.$('button:has-text("Demo"), button[title="Cargar muestra demo"]');
    if (demoBtn) {
      await demoBtn.click();
      await mobilePage.waitForTimeout(4000);
    }
  } catch (e) {}
  await captureScreen(mobilePage, '02_biometria_escaner_ia', true);

  // Scroll mobile to somatotype card
  await mobilePage.evaluate(() => window.scrollBy(0, 480));
  await mobilePage.waitForTimeout(800);
  await captureScreen(mobilePage, '02_somatotipo_diagnostico', true);

  // Tab Dieta Móvil
  try {
    const dietaTab = await mobilePage.$('button:has-text("Dieta")');
    if (dietaTab) {
      await dietaTab.click();
      await mobilePage.waitForTimeout(1000);
      await captureScreen(mobilePage, '03_plan_nutricional_dieta', true);
    }
  } catch (e) {}

  // Mobile Screen 4: Prescripción
  console.log('[Móvil] Navegando a Prescripción...');
  await mobilePage.goto('http://localhost:5173/prescripcion', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await captureScreen(mobilePage, '04_prescripcion_crossselling', true);

  // Mobile Screen 5: POS
  console.log('[Móvil] Navegando a POS...');
  await mobilePage.goto('http://localhost:5173/pos', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  try {
    const addButtons = await mobilePage.$$('button:has-text("Añadir"), div.cursor-pointer[class*="group"], button[title*="Añadir"]');
    if (addButtons.length > 0) {
      await addButtons[0].click();
      await mobilePage.waitForTimeout(600);
    }
  } catch (e) {}
  await captureScreen(mobilePage, '05_pos_caja_ventas', true);

  // Mobile Screen 6: Predicciones
  console.log('[Móvil] Navegando a Predicciones...');
  await mobilePage.goto('http://localhost:5173/predicciones', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2500);
  await captureScreen(mobilePage, '06_predicciones_demanda_ia', true);

  // Mobile Screen 7: Clientes
  console.log('[Móvil] Navegando a Clientes...');
  await mobilePage.goto('http://localhost:5173/admin/clientes', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await captureScreen(mobilePage, '07_admin_clientes', true);

  await mobileContext.close();
  await browser.close();
  console.log('\n=== ¡TODAS LAS CAPTURAS DEL SISTEMA REAL HAN SIDO COMPLETADAS CON ÉXITO! ===');
}

run().catch((err) => {
  console.error('Error durante la ejecución del script:', err);
  process.exit(1);
});
