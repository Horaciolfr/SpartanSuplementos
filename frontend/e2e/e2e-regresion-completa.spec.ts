import { test, expect } from '@playwright/test';

test.describe('Spartan Suplementos - Suite E2E de Regresión Integral (Tarea 19)', () => {

  test('01 - E2E Login: Autenticación exitosa y redirección de sesión', async ({ page }) => {
    await page.route('**/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-token-e2e',
          token_type: 'bearer',
          rol: 'EMPLEADO',
          usuario: { id_usuario: 3, email: 'cajero@spartan.dev', nombres: 'Cajero', apellidos: 'Spartan' },
        }),
      });
    });

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_usuario: 3,
          email: 'cajero@spartan.dev',
          nombres: 'Cajero',
          apellidos: 'Spartan',
          rol: 'EMPLEADO',
          estado_cuenta: 'ACTIVO',
        }),
      });
    });

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();

    await page.locator('input#email').fill('cajero@spartan.dev');
    await page.locator('input[type="password"]').fill('Spartan2026!');
    await page.locator('button[type="submit"]').click();

    // Redirección automática a /pos para rol EMPLEADO
    await expect(page).toHaveURL(/\/pos$/);
    await expect(page.getByRole('heading', { name: /Caja/i })).toBeVisible();
  });

  test('02 - E2E Venta POS: Selección de productos, emisión y validación de recibo', async ({ page }) => {
    // Interceptar login
    await page.route('**/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-token-pos',
          token_type: 'bearer',
          rol: 'EMPLEADO',
          usuario: { id_usuario: 3, email: 'cajero@spartan.dev', nombres: 'Cajero', apellidos: 'Spartan' },
        }),
      });
    });

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_usuario: 3,
          email: 'cajero@spartan.dev',
          nombres: 'Cajero',
          apellidos: 'Spartan',
          rol: 'EMPLEADO',
          estado_cuenta: 'ACTIVO',
        }),
      });
    });

    // Interceptar catálogo POS
    await page.route('**/catalogo/productos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id_producto: 1,
            id_categoria: 1,
            codigo_sku: 'SKU-PROT-WHEY-01',
            nombre_producto: '100% Gold Standard Whey 5lb',
            precio_unitario: 380.0,
            stock_actual: 45,
            stock_seguridad: 10,
            estado_activo: true,
            categoria: { id_categoria: 1, nombre_categoria: 'Proteínas' },
          },
          {
            id_producto: 2,
            id_categoria: 1,
            codigo_sku: 'SKU-CREA-001',
            nombre_producto: 'Creatina Creapure 300g',
            precio_unitario: 210.0,
            stock_actual: 30,
            stock_seguridad: 5,
            estado_activo: true,
            categoria: { id_categoria: 1, nombre_categoria: 'Creatinas' },
          },
        ]),
      });
    });

    // Interceptar emisión de venta
    await page.route('**/pos/ventas', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id_venta: 501,
          numero_recibo: 'REC-E2E-9988',
          total_transaccion: 590.0,
          estado_pago: 'PAGADO',
          fecha_hora_venta: new Date().toISOString(),
          cajero: 'Cajero Spartan',
          cliente: 'Consumidor Final',
          detalles: [
            {
              id_detalle_venta: 1,
              id_producto: 1,
              codigo_sku: 'SKU-PROT-WHEY-01',
              nombre_producto: '100% Gold Standard Whey 5lb',
              cantidad: 1,
              precio_historico: 380.0,
              subtotal: 380.0,
            },
            {
              id_detalle_venta: 2,
              id_producto: 2,
              codigo_sku: 'SKU-CREA-001',
              nombre_producto: 'Creatina Creapure 300g',
              cantidad: 1,
              precio_historico: 210.0,
              subtotal: 210.0,
            },
          ],
        }),
      });
    });

    // Iniciar sesión
    await page.goto('/login');
    await page.locator('input#email').fill('cajero@spartan.dev');
    await page.locator('input[type="password"]').fill('Spartan2026!');
    await page.locator('button[type="submit"]').click();

    // Validar llegada a POS
    await expect(page).toHaveURL(/\/pos$/);
    await expect(page.getByRole('heading', { name: /Caja/i })).toBeVisible();

    // Agregar primer producto al carrito
    const prodWhey = page.getByText('100% Gold Standard Whey 5lb').first();
    await expect(prodWhey).toBeVisible();
    await prodWhey.click();

    // Agregar segundo producto
    const prodCrea = page.getByText('Creatina Creapure 300g').first();
    await expect(prodCrea).toBeVisible();
    await prodCrea.click();

    // Validar Total calculado en pantalla
    await expect(page.getByText('Bs. 590.00').first()).toBeVisible();

    // Emitir venta
    const btnEmitir = page.getByRole('button', { name: /Emitir Venta/i });
    await expect(btnEmitir).toBeEnabled();
    await btnEmitir.click();

    // Validar recibo
    await expect(page.getByText('REC-E2E-9988')).toBeVisible();
  });

  test('03 - E2E Captura & Biometría: Carga de fotograma y diagnóstico de somatotipo', async ({ page }) => {
    // Interceptar login
    await page.route('**/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-token-cliente',
          token_type: 'bearer',
          rol: 'CLIENTE',
          usuario: { id_usuario: 4, email: 'cliente@spartan.dev', nombres: 'Carlos', apellidos: 'Atleta' },
        }),
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
          estado_cuenta: 'ACTIVO',
        }),
      });
    });

    // Interceptar análisis de pose
    await page.route('**/ia/pose/analizar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          landmarks_count: 33,
          precision: 0.945,
          precision_captura: 0.945,
          somatotipo_estimado: 'MESOMORFO',
          probabilidades_somatotipo: {
            MESOMORFO: 0.88,
            ECTOMORFO: 0.08,
            ENDOMORFO: 0.04,
          },
          scores_heath_carter: {
            endo: 2.1,
            meso: 5.4,
            ecto: 2.2,
          },
          metricas_biometricas: {
            relacion_hombro_cadera: 1.42,
            ancho_hombros_norm: 0.38,
            ancho_cadera_norm: 0.27,
            postura: 'ERECTA',
          },
          landmarks: [
            { id: 0, nombre: 'NOSE', x: 0.5, y: 0.2, z: 0.0, visibilidad: 0.99 },
            { id: 11, nombre: 'LEFT_SHOULDER', x: 0.4, y: 0.3, z: -0.1, visibilidad: 0.95 },
            { id: 12, nombre: 'RIGHT_SHOULDER', x: 0.6, y: 0.3, z: -0.1, visibilidad: 0.95 },
          ],
        }),
      });
    });

    // Iniciar sesión
    await page.goto('/login');
    await page.locator('input#email').fill('cliente@spartan.dev');
    await page.locator('input[type="password"]').fill('Spartan2026!');
    await page.locator('button[type="submit"]').click();

    // Redirección a biometría para cliente
    await expect(page).toHaveURL(/\/biometria$/);
    await expect(page.getByRole('heading', { name: 'Biometría', exact: true })).toBeVisible();

    // Cargar muestra demo
    const btnDemo = page.getByRole('button', { name: 'Demo' });
    await expect(btnDemo).toBeVisible();
    await btnDemo.click();

    // Verificar somatotipo inferido
    await expect(page.getByText('MESOMORFO', { exact: true }).first()).toBeVisible();
  });

  test('04 - E2E Prescripción Nutricional: Consulta de prescripción y reglas explicables CART', async ({ page }) => {
    // Interceptar login
    await page.route('**/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-token-cliente',
          token_type: 'bearer',
          rol: 'CLIENTE',
          usuario: { id_usuario: 4, email: 'cliente@spartan.dev', nombres: 'Carlos', apellidos: 'Atleta' },
        }),
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
          estado_cuenta: 'ACTIVO',
        }),
      });
    });

    // Interceptar prescripción
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
              fecha_prescripcion: '2026-10-13T20:00:00Z',
            },
          ],
        }),
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

    // Navegar a prescripción 101
    await page.goto('/prescripcion/101');
    await expect(page.getByRole('heading', { name: /Prescripción Nutricional/i })).toBeVisible();
    await expect(page.getByText('MESOMORFO', { exact: true })).toBeVisible();
    await expect(page.getByText('Dragon Pharma ATP Force Creatine')).toBeVisible();
    await expect(page.getByText(/Regla: CART-4/i)).toBeVisible();
    await expect(page.getByText(/SI categoria!=INDUMENTARIA/i)).toBeVisible();
  });

});
