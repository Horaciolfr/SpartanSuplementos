# Rol de backend/

La aplicación ejecutable y autoritativa del Gateway ERP es app/; Docker inicia
uvicorn app.main:app.

backend/ se conserva por dos razones verificables:

1. backend/alembic/ es la fuente de migraciones indicada por el alembic.ini
   raíz y ejecutada por docker/backend_entrypoint.sh.
2. Los módulos restantes reproducen la implementación histórica usada por
   qa_testing/unit_tests/. No se importan desde app/, no se copian en la imagen
   de producción y no forman parte del runtime ASGI.

No deben añadirse endpoints ni lógica nueva bajo backend/. Toda evolución
funcional pertenece a app/; solo las revisiones de esquema pertenecen a
backend/alembic/.
