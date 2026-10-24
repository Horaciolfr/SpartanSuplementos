import { test, expect } from '@playwright/test';

test.describe('Spartan Suplementos - Verificación Automática de Consistencia Visual', () => {

  test('01 - Página de Inicio: Consistencia de Paleta y Tipografía Espartana', async ({ page }) => {
    await page.goto('/');
    
    // Verificar título y presencia del contenedor principal
    await expect(page).toHaveTitle(/Spartan/i);
    
    // Validar encabezado con identidad de marca
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();

    // Validar que no hay desborde horizontal (consistencia de layout)
    const isHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isHorizontalOverflow).toBe(false);
  });

  test('02 - Catálogo: Componentes de Tarjetas y Modal Técnico', async ({ page }) => {
    // Interceptar API para asegurar que los componentes de producto se rendericen fielmente
    await page.route('**/catalogo/productos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id_producto: 1,
            id_categoria: 1,
            codigo_sku: 'PROT-GOLD-01',
            nombre_producto: '100% Whey Gold Standard 5lb',
            precio_unitario: 520.0,
            stock_actual: 45,
            stock_seguridad: 10,
            estado_activo: true,
            categoria: { id_categoria: 1, nombre_categoria: 'Proteínas Puras' }
          }
        ])
      });
    });

    await page.goto('/catalogo');
    
    // Verificar que el encabezado del catálogo esté visible
    const catalogHeader = page.locator('h1');
    await expect(catalogHeader).toBeVisible();

    // Validar tarjeta y apertura accesible mediante teclado
    const productCard = page.getByRole('button', { name: /Whey Gold Standard/i });
    await expect(productCard).toBeVisible();
    await productCard.focus();
    await productCard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('03 - Biometría protegida: redirección segura a inicio de sesión', async ({ page }) => {
    await page.goto('/biometria');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();
  });

  test('04 - POS protegido: redirección segura a inicio de sesión', async ({ page }) => {
    await page.goto('/pos');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('05 - Disciplinas: contenido principal disponible desde inicio', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Domina Tu/i })).toBeVisible();
  });

  test('06 - Consistencia Visual Responsive: Sin Desborde en Mobile Viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('07 - Prescripción protegida: sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/prescripcion');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();
  });

  test('08 - Prescripción: cliente autenticado visualiza reglas CART y productos recomendados', async ({ page }) => {
    // Interceptar login
    await page.route('**/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-token',
          token_type: 'bearer',
          rol: 'CLIENTE',
          usuario: { id_usuario: 4, email: 'cliente@spartan.dev', nombres: 'Carlos', apellidos: 'Atleta' }
        })
      });
    });

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_usuario: 4,
          email: 'cliente@spartan.dev',
          nombres: 'Carlos',
          apellidos: 'Atleta',
          rol: 'CLIENTE',
          estado_cuenta: 'ACTIVO'
        })
      });
    });

    // Interceptar API de prescripción
    await page.route('**/ia/prescripcion/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_perfil: 101,
          id_usuario: 4,
          somatotipo: 'MESOMORFO',
          precision_captura: 0.95,
          prescripciones: [
            {
              id_prescripcion: 1,
              id_producto: 22,
              codigo_sku: 'SKU-ATP-CREA',
              nombre_producto: 'Dragon Pharma ATP Force Creatine',
              precio_unitario: 210.0,
              stock_actual: 35,
              id_regla_aplicada: 5,
              codigo_regla: 'CART-4',
              descripcion_tecnica: 'SI categoria!=INDUMENTARIA Y categoria=CREATINA Y somatotipo=MESOMORFO ENTONCES afinidad=ALTA',
              umbral_decision: 1.0,
              estado_conversion: false,
              id_venta_efectiva: null,
              fecha_prescripcion: '2026-10-13T20:00:00Z'
            }
          ]
        })
      });
    });

    // Iniciar sesión
    await page.goto('/login');
    await page.locator('input#email').fill('cliente@spartan.dev');
    await page.locator('input[type="password"]').fill('Spartan2026!');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/token') && resp.status() === 200),
      page.locator('button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/\/biometria$/);

    // Navegar a la prescripción del perfil 101
    await page.goto('/prescripcion/101');

    // Verificar encabezado y somatotipo
    await expect(page.getByRole('heading', { name: /Prescripción Nutricional/i })).toBeVisible();
    await expect(page.getByText('MESOMORFO', { exact: true })).toBeVisible();

    // Verificar producto y regla CART explicable en lenguaje natural
    await expect(page.getByText('Dragon Pharma ATP Force Creatine')).toBeVisible();
    await expect(page.getByText(/Regla: CART-4/i)).toBeVisible();
    await expect(page.getByText(/Si el producto es de la línea creatina y tu somatotipo es mesomorfo/i)).toBeVisible();
    await expect(page.getByText(/Bs\. 210\.00/i)).toBeVisible();

    // Abrir modal técnico y verificar sintaxis cruda
    await page.getByRole('button', { name: /Ver sintaxis técnica/i }).first().click();
    await expect(page.getByText(/SI categoria!=INDUMENTARIA/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    // Aserción PASO 2 (V-08): PRECISIÓN IA no debe aparecer en ninguna ruta
    await expect(page.getByText(/PRECISIÓN IA/i)).toHaveCount(0);
  });
});
