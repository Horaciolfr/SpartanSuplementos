# Guia de Dockerizacion — Spartan Suplementos Bolivia

Toda la arquitectura del monorepo (Base de Datos PostgreSQL 16, Gateway ERP FastAPI, Microservicio de IA y Frontend SPA) esta empaquetada para encenderse y gestionarse desde Docker Desktop o mediante la terminal con un solo comando.

---

## Inicio Rapido (Un Solo Comando)

En la raiz del proyecto, ejecuta:

```powershell
docker compose up --build -d
```

> **Nota:** La primera vez descargara las imagenes base (Python 3.11, Node 20, Nginx y PostgreSQL) y compilara el bundle de produccion. Las siguientes veces iniciara en cuestion de segundos.

Para detener todos los servicios:
```powershell
docker compose down
```

---

## Gestion Visual desde Docker Desktop

Como tienes la aplicacion de escritorio Docker Desktop:
1. Abre Docker Desktop.
2. Veras el grupo de contenedores llamado `proyectoss` (o el nombre de la carpeta).
3. Dentro encontraras los 4 contenedores con nombres descriptivos:
   - `spartan-db`: Base de Datos PostgreSQL 16 con Kardex ACID y los 198 productos reales.
   - `spartan-backend`: Servidor FastAPI (inventario, POS, usuarios y auth).
   - `spartan-ia`: Microservicio desacoplado de Vision Artificial e Inferencia Biometrica.
   - `spartan-frontend`: Servidor Nginx ultra-rapido con la SPA de Vite/React.
4. Puedes iniciar (Play), pausar, reiniciar o apagar (Stop) cualquiera de ellos o todo el grupo con un solo clic.

---

## Servicios y Accesos Disponibles

| Servicio | Contenedor | URL / Puerto Host | Descripcion |
| --- | --- | --- | --- |
| **Frontend Web SPA** | `spartan-frontend` | **[http://localhost:5173](http://localhost:5173)** | Catalogo Digital y Punto de Venta (POS) optimizado con Nginx. |
| **Backend ERP Gateway** | `spartan-backend` | **[http://localhost:8000](http://localhost:8000)** <br> *(Docs: [http://localhost:8000/docs](http://localhost:8000/docs))* | API REST transaccional con Kardex ACID (`SELECT FOR UPDATE`). |
| **Microservicio IA** | `spartan-ia` | **[http://localhost:8001](http://localhost:8001)** <br> *(Docs: [http://localhost:8001/docs](http://localhost:8001/docs))* | Motor de inferencia y somatotipos desacoplado. |
| **PostgreSQL 16** | `spartan-db` | **`localhost:5433`** <br> *(Interno red Docker: `db:5432`)* | DB: `spartan_db`, User: `postgres`, Contrasena definida en `.env.docker`. |

*Nota sobre el puerto de PostgreSQL:* Se mapea al puerto **5433** en tu maquina Windows para que nunca entre en conflicto si tienes tu PostgreSQL local encendido en el puerto 5432. Los contenedores se comunican internamente a traves de la red `spartan-network`.

---

## Inicializacion Automatica de Datos (Seed)

Al arrancar el contenedor `spartan-db` por primera vez:
1. Ejecuta [`docker/postgres/01_init_schema.sql`](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/docker/postgres/01_init_schema.sql):
   - Crea los esquemas `parametros`, `erp`, `ia`.
   - Crea tablas, claves foraneas e indices GIN.
   - Instala las funciones y triggers de PostgreSQL `trg_kardex_detalle_venta` y `trg_kardex_detalle_compra` con bloqueo pesimista `SELECT FOR UPDATE`.
2. Ejecuta [`docker/postgres/02_seed_data.sql`](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/docker/postgres/02_seed_data.sql):
   - Carga roles (`ADMINISTRADOR`, `CAJERO`, `CLIENTE`).
   - Carga usuarios de prueba con contrasenas encriptadas bcrypt.
   - Carga las categorias de suplementos.
   - Carga los **198 productos autenticos** con fotos, precios en Bolivianos y fichas tecnicas.

---

## Comandos Utiles de Mantenimiento

- **Ver logs en tiempo real:**
  ```powershell
  docker compose logs -f backend
  docker compose logs -f frontend
  ```
- **Verificar estado de los contenedores:**
  ```powershell
  docker compose ps
  ```
- **Entrar a la consola de PostgreSQL del contenedor:**
  ```powershell
  docker compose exec db psql -U postgres -d spartan_db
  ```
- **Reconstruir imagenes tras hacer cambios:**
  ```powershell
  docker compose build
  docker compose up -d
  ```
