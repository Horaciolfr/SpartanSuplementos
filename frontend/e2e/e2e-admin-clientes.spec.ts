import { test, expect } from '@playwright/test';

test.describe('Módulo de Administración de Clientes y Planes Nutricionales (Bloque 28)', () => {

  test('01 - ADMINISTRADOR: Visualización de tabla de clientes, filtrado por somatotipo y ficha de detalle', async ({ page }) => {
    // 1. Mock de autenticación para ADMINISTRADOR
    await page.route('**/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-admin-token-e2e',
          token_type: 'bearer',
          rol: 'ADMINISTRADOR',
          usuario: { id_usuario: 2, email: 'admin@spartan.dev', nombres: 'Admin', apellidos: 'Spartan' },
        }),
      });
    });

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_usuario: 2,
          email: 'admin@spartan.dev',
          nombres: 'Admin',
          apellidos: 'Spartan',
          rol: 'ADMINISTRADOR',
          estado_cuenta: 'ACTIVO',
        }),
      });
    });

    // 2. Mock de API /admin/clientes (lista inicial vs filtrada)
    await page.route('**/admin/clientes?*', async (route) => {
      const url = new URL(route.request().url());
      const somaFilter = url.searchParams.get('somatotipo');

      if (somaFilter === '3') {
        // Filtrado por Endomorfo (id=3)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total: 1,
            pagina: 1,
            tamano: 20,
            items: [
              {
                id_usuario: 10,
                nombres: 'Laura',
                apellidos: 'Endomorfa',
                email: 'laura@spartan.dev',
                numero_documento: '55667788',
                esta_verificado: true,
                fecha_creacion: '2026-02-10T10:00:00Z',
                ultimo_perfil: {
                  id_perfil: 202,
                  somatotipo: 'ENDOMORFO',
                  estatura_cm: 165.0,
                  peso_kg: 72.0,
                  visibilidad_media: 0.96,
                  fecha_captura: '2026-03-01T14:30:00Z',
                },
                prescripciones: {
                  total: 1,
                  convertidas: 0,
                  ultima_fecha: '2026-03-01T14:35:00Z',
                },
                plan_nutricional: {
                  nombre_plan: 'Plan Endomorfo - Déficit Moderado y Alta Proteína',
                },
              },
            ],
          }),
        });
      } else {
        // Lista sin filtrar (muestra al cliente Mesomorfo y un Ectomorfo)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total: 2,
            pagina: 1,
            tamano: 20,
            items: [
              {
                id_usuario: 4,
                nombres: 'Carlos',
                apellidos: 'Atleta',
                email: 'cliente@spartan.dev',
                numero_documento: '10000003',
                esta_verificado: true,
                fecha_creacion: '2026-01-15T12:00:00Z',
                ultimo_perfil: {
                  id_perfil: 101,
                  somatotipo: 'MESOMORFO',
                  estatura_cm: 178.0,
                  peso_kg: 75.0,
                  visibilidad_media: 0.98,
                  fecha_captura: '2026-02-20T10:00:00Z',
                },
                prescripciones: {
                  total: 2,
                  convertidas: 1,
                  ultima_fecha: '2026-02-20T10:05:00Z',
                },
                plan_nutricional: {
                  nombre_plan: 'Plan Mesomorfo - Equilibrio y Recomposición',
                },
              },
              {
                id_usuario: 11,
                nombres: 'David',
                apellidos: 'Ectomorfo',
                email: 'david@spartan.dev',
                numero_documento: '88990011',
                esta_verificado: true,
                fecha_creacion: '2026-02-01T09:00:00Z',
                ultimo_perfil: {
                  id_perfil: 205,
                  somatotipo: 'ECTOMORFO',
                  estatura_cm: 182.0,
                  peso_kg: 68.0,
                  visibilidad_media: 0.95,
                  fecha_captura: '2026-02-15T11:00:00Z',
                },
                prescripciones: {
                  total: 0,
                  convertidas: 0,
                  ultima_fecha: null,
                },
                plan_nutricional: {
                  nombre_plan: 'Plan Ectomorfo - Superávit Controlado',
                },
              },
            ],
          }),
        });
      }
    });

    // 3. Mock de API /admin/clientes/4 (ficha de detalle)
    await page.route('**/admin/clientes/4', async (route) => {
      if (route.request().resourceType() === 'document') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_usuario: 4,
          nombres: 'Carlos',
          apellidos: 'Atleta',
          email: 'cliente@spartan.dev',
          numero_documento: '10000003',
          esta_verificado: true,
          fecha_creacion: '2026-01-15T12:00:00Z',
          genero: 'MASCULINO',
          tipo_documento: 'CI',
          perfiles: [
            {
              id_perfil: 101,
              id_somatotipo: 2,
              somatotipo: 'MESOMORFO',
              estatura_cm: 178.0,
              peso_kg: 75.0,
              precision_captura: 0.98,
              fecha_captura: '2026-02-20T10:00:00Z',
              coordenadas_espaciales: {},
            },
          ],
          prescripciones: [
            {
              id_prescripcion: 501,
              id_perfil: 101,
              fecha_prescripcion: '2026-02-20T10:05:00Z',
              producto: {
                id_producto: 3,
                sku: 'SKU-CREA-001',
                nombre: 'Creatina Monohidratada 300g',
                precio: 180.0,
                stock_actual: 230,
              },
              regla: {
                id_regla: 3,
                codigo: 'CART-MESO-01',
                descripcion: 'Recomendación de creatina monohidratada para mesomorfo en fuerza explosiva',
              },
              conversion: {
                id_venta_efectiva: 1204,
                estado: true,
              },
            },
          ],
          plan_nutricional: {
            id_plan: 2,
            id_somatotipo: 2,
            nombre_plan: 'Plan Mesomorfo - Equilibrio y Recomposición',
            objetivo: 'Equilibrio metabólico y recomposición corporal con soporte proteico óptimo',
            distribucion_macronutrientes: {
              proteina_pct: 30,
              carbohidratos_pct: 45,
              grasas_pct: 25,
            },
            pautas: [
              'Ingesta isocalórica o ciclado moderado de hidratos según intensidad',
              'Aporte proteico objetivo en rango de 2.0 a 2.4 g/kg de peso corporal',
            ],
            comidas_sugeridas: [
              { comida: 'Desayuno', sugerencia: 'Huevos revueltos con avena y frutos rojos', timing: '08:00' },
              { comida: 'Almuerzo', sugerencia: 'Ternera magra con patata asada y brócoli', timing: '14:00' },
            ],
            disclaimer: 'Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional',
          },
        }),
      });
    });

    // Iniciar sesión como ADMINISTRADOR
    await page.goto('/login');
    await page.locator('input#email').fill('admin@spartan.dev');
    await page.locator('input[type="password"]').fill('SpartanAdmin2026!');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/token') && r.status() === 200),
      page.locator('button[type="submit"]').click(),
    ]);

    // Navegar a /admin/clientes
    await page.goto('/admin/clientes');
    await expect(page).toHaveURL(/\/admin\/clientes/);
    await expect(page.getByRole('heading', { name: /Administración de Clientes/i })).toBeVisible();

    // Validar que se visualiza al menos un cliente y su somatotipo
    await expect(page.getByText('Carlos Atleta')).toBeVisible();
    await expect(page.getByRole('table').getByText('Mesomorfo', { exact: true })).toBeVisible();

    // Aplicar filtro por Somatotipo (Endomorfo = 3)
    const selectSoma = page.locator('select').first();
    await selectSoma.selectOption('3');

    // Verificar que la URL refleja somatotipo=3 y la tabla cambia
    await expect(page).toHaveURL(/somatotipo=3/);
    await expect(page.getByText('Laura Endomorfa')).toBeVisible();
    await expect(page.getByText('Carlos Atleta')).toBeHidden();
    await expect(page.getByText('David Ectomorfo')).toBeHidden();

    // Restablecer o navegar a la ficha de Carlos Atleta (/admin/clientes/4)
    await page.goto('/admin/clientes/4');
    await expect(page).toHaveURL(/\/admin\/clientes\/4$/);

    // Validar encabezado y datos de ficha
    await expect(page.getByRole('heading', { name: /Carlos Atleta/i })).toBeVisible();
    await expect(page.getByText('10000003')).toBeVisible();

    // Validar prescripción con regla CART
    await expect(page.getByText('Creatina Monohidratada 300g')).toBeVisible();
    await expect(page.getByText(/Regla: CART-MESO-01/i)).toBeVisible();
    await expect(page.getByText(/Convertida \(Venta #1204\)/i)).toBeVisible();

    // Validar tarjeta de plan nutricional con macronutrientes y disclaimer
    await expect(page.getByText('Plan Mesomorfo - Equilibrio y Recomposición').first()).toBeVisible();
    await expect(page.getByText('30%').first()).toBeVisible(); // Proteínas
    await expect(page.getByText('45%').first()).toBeVisible(); // Carbos
    await expect(page.getByText('25%').first()).toBeVisible(); // Grasas
    await expect(
      page.getByText(/Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional/i)
    ).toBeVisible();
  });

  test('02 - CAJERO / EMPLEADO: Denegación de acceso y protección contra fuga de datos en /admin/clientes', async ({ page }) => {
    // 1. Mock de autenticación para CAJERO / EMPLEADO
    await page.route('**/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-cajero-token-e2e',
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

    // Iniciar sesión como EMPLEADO
    await page.goto('/login');
    await page.locator('input#email').fill('cajero@spartan.dev');
    await page.locator('input[type="password"]').fill('SpartanAdmin2026!');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/token') && r.status() === 200),
      page.locator('button[type="submit"]').click(),
    ]);

    // Intentar navegar directamente a /admin/clientes
    await page.goto('/admin/clientes');

    // Debe mostrar la vista de denegación 403 de ProtectedRoute sin filtrar datos
    await expect(page.getByRole('heading', { name: /Acceso No Autorizado \(403\)/i })).toBeVisible();
    await expect(page.getByText(/no cuenta con los privilegios necesarios para ver este módulo/i)).toBeVisible();

    // Verificar que no se expone la tabla ni datos de clientes
    await expect(page.getByRole('heading', { name: /Administración de Clientes/i })).toBeHidden();
    await expect(page.locator('table')).toBeHidden();
  });

});
