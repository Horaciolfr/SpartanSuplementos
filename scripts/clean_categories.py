import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

async def main():
    sqls = [
        "UPDATE erp.categoria_producto SET nombre_categoria = 'CREATINAS & FUERZA' WHERE id_categoria = 4",
        "UPDATE erp.categoria_producto SET nombre_categoria = 'PRE-ENTRENOS & ENERGIA' WHERE id_categoria = 5",
        "UPDATE erp.categoria_producto SET nombre_categoria = 'GANADORES DE MASA (MASS GAINERS)' WHERE id_categoria = 6",
        "UPDATE erp.categoria_producto SET nombre_categoria = 'AMINOACIDOS & RECUPERACION' WHERE id_categoria = 7",
        "UPDATE erp.categoria_producto SET nombre_categoria = 'QUEMADORES & DEFINICION' WHERE id_categoria = 8",
        "UPDATE erp.categoria_producto SET nombre_categoria = 'SALUD, VITAMINAS & ARTICULACIONES' WHERE id_categoria = 9",
    ]
    async with engine.begin() as conn:
        for s in sqls:
            await conn.execute(text(s))
        rows = await conn.execute(text("SELECT id_categoria, nombre_categoria FROM erp.categoria_producto ORDER BY id_categoria"))
        for r in rows:
            print(dict(r._mapping))

if __name__ == '__main__':
    asyncio.run(main())
