const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', 'frontend', 'node_modules', '@playwright', 'test'));

async function capturarMockups() {
  console.log('Iniciando captura de mockups con Playwright...');
  const browser = await chromium.launch({ headless: true });

  const outputDir = path.join(__dirname, '..', 'docs', 'mockups', 'capturas');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screens = [
    {
      name: '01_biometria_escaner',
      file: path.join(__dirname, '..', 'docs', 'mockups', 'screen1_biometria.html')
    },
    {
      name: '02_dashboard_somatotipo',
      file: path.join(__dirname, '..', 'docs', 'mockups', 'screen2_somatotipo.html')
    },
    {
      name: '03_plan_nutricional',
      file: path.join(__dirname, '..', 'docs', 'mockups', 'screen3_nutricion.html')
    },
    {
      name: '04_pos_inventario',
      file: path.join(__dirname, '..', 'docs', 'mockups', 'screen4_pos_erp.html')
    }
  ];

  for (const s of screens) {
    const fileUrl = 'file:///' + s.file.replace(/\\/g, '/');

    // 1. Captura Web Desktop (1440x900)
    console.log(`Capturando Web Desktop: ${s.name}...`);
    const pageDesktop = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2
    });
    await pageDesktop.goto(fileUrl, { waitUntil: 'networkidle' });
    const desktopPath = path.join(outputDir, `web_${s.name}.png`);
    await pageDesktop.screenshot({ path: desktopPath, fullPage: false });
    await pageDesktop.close();
    console.log(`✓ Guardado: ${desktopPath}`);

    // 2. Captura Móvil (390x844 - iPhone 14 Pro aspect)
    console.log(`Capturando Móvil: ${s.name}...`);
    const pageMobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });
    await pageMobile.goto(fileUrl, { waitUntil: 'networkidle' });
    const mobilePath = path.join(outputDir, `movil_${s.name}.png`);
    await pageMobile.screenshot({ path: mobilePath, fullPage: false });
    await pageMobile.close();
    console.log(`✓ Guardado: ${mobilePath}`);
  }

  await browser.close();
  console.log('¡Todas las capturas de pantalla han sido generadas con éxito en docs/mockups/capturas/!');
}

capturarMockups().catch(err => {
  console.error('Error generando capturas:', err);
  process.exit(1);
});
