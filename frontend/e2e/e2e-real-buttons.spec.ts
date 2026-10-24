import { test, expect } from '@playwright/test';

test.describe('Prueba Real de Interacción de Botones y Flujos (Sin Mocks)', () => {
  test('Verificación en vivo de todos los botones de Biometría y Navegación', async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // 1. Iniciar sesión real
    await page.goto('/login');
    await page.locator('input#email').fill('admin@spartan.dev');
    await page.locator('input[type="password"]').fill('123456789');
    await page.locator('button[type="submit"]').click();

    // Esperar redirección tras login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log('URL tras login:', page.url());

    // 2. Navegar a /biometria
    await page.goto('/biometria');
    await expect(page.getByRole('heading', { name: 'Biometría', exact: true })).toBeVisible({ timeout: 10000 });

    // Verificar modal animado de recomendaciones iniciales (CaptureGuideModal) si está presente
    const btnCerrarGuiaInicial = page.getByRole('button', { name: /Cerrar guía/i });
    if (await btnCerrarGuiaInicial.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(page.getByText(/Coloca el teléfono a 2 metros/i)).toBeVisible();
      await btnCerrarGuiaInicial.click();
      await page.waitForTimeout(300);
    }

    // Probar botón "Guía de Captura" para reabrir el modal, avanzar con Siguiente y cerrarlo
    const btnGuia = page.getByRole('button', { name: /Guía de Captura/i });
    if (await btnGuia.isVisible().catch(() => false)) {
      await btnGuia.click();
      await page.waitForTimeout(300);
      await expect(page.getByText(/Coloca el teléfono a 2 metros/i)).toBeVisible();
      // Avanzar paso
      const btnSiguiente = page.getByRole('button', { name: /Siguiente/i });
      if (await btnSiguiente.isVisible().catch(() => false)) {
        await btnSiguiente.click();
        await page.waitForTimeout(200);
        await expect(page.getByText(/Ponte frente a la luz/i)).toBeVisible();
      }
      const btnCerrarGuia = page.getByRole('button', { name: /Cerrar guía/i });
      await btnCerrarGuia.click();
      await page.waitForTimeout(300);
    }

    // 3. Probar botón "Arquitectura" (Modal)
    const btnArqui = page.getByRole('button', { name: /Arquitectura/i });
    await expect(btnArqui).toBeVisible();
    await btnArqui.click();
    await page.waitForTimeout(500);
    // Verificar que el modal de arquitectura abrió
    const modalTitle = page.getByText(/Arquitectura Técnica/i).first();
    await expect(modalTitle).toBeVisible();
    // Cerrar modal
    const closeBtn = page.getByRole('button', { name: /Cerrar modal de arquitectura técnica/i }).first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    // 4. Probar cambio de Pestañas (Evaluación, Rutina, Dieta, Métricas, Telemetría)
    const tabRutina = page.getByRole('button', { name: /Rutina/i });
    await expect(tabRutina).toBeVisible();
    await tabRutina.click();
    await page.waitForTimeout(300);

    const tabDieta = page.getByRole('button', { name: /Dieta/i });
    await expect(tabDieta).toBeVisible();
    await tabDieta.click();
    await page.waitForTimeout(300);

    const tabMetricas = page.getByRole('button', { name: /Métricas/i });
    await expect(tabMetricas).toBeVisible();
    await tabMetricas.click();
    await page.waitForTimeout(300);

    const tabTelemetria = page.getByRole('button', { name: /Telemetría/i });
    if (await tabTelemetria.isVisible()) {
      await tabTelemetria.click();
      await page.waitForTimeout(300);
    }

    const tabEval = page.getByRole('button', { name: /Evaluación/i });
    await expect(tabEval).toBeVisible();
    await tabEval.click();
    await page.waitForTimeout(300);

    // 5. Probar botón "Demo" (carga de muestra real y petición real a /ia/pose/analizar)
    const btnDemo = page.getByRole('button', { name: /Demo/i });
    await expect(btnDemo).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/ia/pose/analizar'), { timeout: 15000 }),
      btnDemo.click(),
    ]);

    console.log('Respuesta real de /ia/pose/analizar:', response.status());
    expect(response.status()).toBe(200);

    // Verificar resultado en pantalla
    await expect(page.getByText('MESOMORFO', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    console.log('Diagnóstico MESOMORFO visible con éxito');

    // 6. Probar las pestañas AHORA que hay datos analizados
    await tabRutina.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Hipertrofia|Fuerza|Entrenamiento/i).first()).toBeVisible();

    await tabDieta.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Proteína|Calorías|Nutrición|Carbohidratos/i).first()).toBeVisible();

    await tabMetricas.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/V-Taper|Simetría|Hombros/i).first()).toBeVisible();

    // 7. Volver a Evaluación y probar enlace hacia Recomendaciones / Prescripción
    await tabEval.click();
    const btnPrescripcion = page.getByRole('link', { name: /Ver Prescripción Inteligente/i });
    await expect(btnPrescripcion).toBeVisible();
    await btnPrescripcion.click();
    await page.waitForURL(/\/prescripcion/, { timeout: 8000 });
    console.log('Navegación exitosa a:', page.url());

    // 8. En Prescripción, probar interactividad de botones
    const btnVerSintaxis = page.getByRole('button', { name: /Ver sintaxis técnica/i }).first();
    if (await btnVerSintaxis.isVisible()) {
      await btnVerSintaxis.click();
      await page.waitForTimeout(400);
      const modalCart = page.getByText(/Lógica Booleana del Árbol CART/i);
      await expect(modalCart).toBeVisible();
      const btnCerrarCart = page.getByRole('button', { name: 'Cerrar' });
      await btnCerrarCart.click();
    }

    // 9. Probar botones de navegación del Sidebar
    const linkCaja = page.getByRole('link', { name: /Caja/i });
    await expect(linkCaja).toBeVisible();
    await linkCaja.click();
    await page.waitForURL(/\/pos/, { timeout: 8000 });
    console.log('Navegación exitosa a POS:', page.url());

    const linkCatalogo = page.getByRole('link', { name: /Catálogo/i });
    await expect(linkCatalogo).toBeVisible();
    await linkCatalogo.click();
    await page.waitForURL(/\/catalogo/, { timeout: 8000 });
    console.log('Navegación exitosa a Catálogo:', page.url());

    const linkClientes = page.getByRole('link', { name: /Clientes/i });
    await expect(linkClientes).toBeVisible();
    await linkClientes.click();
    await page.waitForURL(/\/admin\/clientes/, { timeout: 8000 });
    console.log('Navegación exitosa a Clientes:', page.url());

    const linkPredicciones = page.getByRole('link', { name: /Predicciones/i });
    await expect(linkPredicciones).toBeVisible();
    await linkPredicciones.click();
    await page.waitForURL(/\/predicciones/, { timeout: 8000 });
    console.log('Navegación exitosa a Predicciones:', page.url());

    console.log('Total console errors detectados:', errors.length);
    console.log('Total failed network requests:', failedRequests.length);
    if (errors.length > 0) {
      console.log('Errores en consola:', errors);
    }
    if (failedRequests.length > 0) {
      console.log('Peticiones fallidas:', failedRequests);
    }

    expect(failedRequests.length).toBe(0);
  });
});
