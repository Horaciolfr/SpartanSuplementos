import { test, expect } from '@playwright/test';

test.describe('Prueba E2E de Nutrición Determinista y RecetaModal', () => {
  test('Flujo completo de Plan Dietético Diario y Modal Clínico en Biometría y Prescripción', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 1. Iniciar sesión real
    await page.goto('/login');
    await page.locator('input#email').fill('admin@spartan.dev');
    await page.locator('input[type="password"]').fill('123456789');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // 2. Navegar a /biometria
    await page.goto('/biometria');
    await expect(page.getByRole('heading', { name: 'Biometría', exact: true })).toBeVisible({ timeout: 10000 });

    // Cerrar modal de bienvenida de guía si aparece
    const btnCerrarGuiaInicial = page.getByRole('button', { name: /Cerrar guía/i });
    if (await btnCerrarGuiaInicial.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnCerrarGuiaInicial.click();
      await page.waitForTimeout(300);
    }

    // 3. Ejecutar demo para obtener diagnóstico real
    const btnDemo = page.getByRole('button', { name: /demo/i });
    await expect(btnDemo).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/ia/pose/analizar'), { timeout: 15000 }),
      btnDemo.click(),
    ]);
    expect(response.status()).toBe(200);

    await expect(page.getByText('MESOMORFO', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // 4. Activar pestaña Dieta (es un button con nombre Dieta)
    const tabDieta = page.getByRole('button', { name: /Dieta/i });
    await expect(tabDieta).toBeVisible();
    await tabDieta.click();
    await page.waitForTimeout(600);

    // Verificar que se visualiza el Plan de Nutrición y Dieta Diaria
    await expect(page.getByText(/Plan de Nutrición y Dieta Diaria/i)).toBeVisible();
    await expect(page.getByText(/Calorías Diarias/i)).toBeVisible();
    await expect(page.getByText(/Proteína/i).first()).toBeVisible();

    // 5. Verificar que existen tarjetas de recetas (6 asignadas)
    const recetaCards = page.locator('.group.bg-\\[\\#111111\\]');
    await expect(recetaCards.first()).toBeVisible({ timeout: 8000 });
    const count = await recetaCards.count();
    console.log(`Tarjetas de recetas encontradas en pestaña Dieta: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    // 6. Hacer clic en una tarjeta de receta para abrir el RecetaModal clínico
    await recetaCards.first().click();
    await page.waitForTimeout(400);

    // Verificar el modal clínico de detalle de receta y prompt fotográfico
    await expect(page.getByText(/Prompt Base de Generación Fotográfica/i)).toBeVisible();
    await expect(page.getByText(/Fotografía gastronómica profesional de/i)).toBeVisible();

    // Probar interacción con el botón de copiar prompt
    const btnCopiarPrompt = page.getByRole('button', { name: /Copiar Prompt/i });
    if (await btnCopiarPrompt.isVisible().catch(() => false)) {
      await btnCopiarPrompt.click();
      await page.waitForTimeout(200);
    }

    // Cerrar modal usando el botón "Cerrar Ficha"
    const btnCerrarModal = page.getByRole('button', { name: /Cerrar Ficha/i });
    await btnCerrarModal.click();
    await page.waitForTimeout(300);

    // 7. Navegar a /prescripcion usando el botón de recomendación
    const tabEval = page.getByRole('button', { name: /Evaluación/i });
    await tabEval.click();
    const btnPrescripcion = page.getByRole('link', { name: /Ver Prescripción Inteligente/i });
    await expect(btnPrescripcion).toBeVisible();
    await btnPrescripcion.click();
    await page.waitForURL(/\/prescripcion/, { timeout: 8000 });

    // Verificar sección de plan dietético sugerido en Prescripción
    await expect(page.getByText(/Prescripción Nutricional/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Plan Nutricional Diario Sugerido/i)).toBeVisible({ timeout: 8000 });

    // 8. Verificar que las tarjetas en prescripción también abren el modal
    const prescripcionRecetaCards = page.locator('.group.bg-\\[\\#111111\\]');
    if (await prescripcionRecetaCards.first().isVisible().catch(() => false)) {
      await prescripcionRecetaCards.first().click();
      await page.waitForTimeout(300);
      await expect(page.getByText(/Prompt Base de Generación Fotográfica/i)).toBeVisible();
      const btnCerrarModalPresc = page.getByRole('button', { name: /Cerrar Ficha/i });
      await btnCerrarModalPresc.click();
    }

    console.log('Total console errors en nutrición E2E:', errors.length);
    expect(errors.length).toBe(0);
  });
});
