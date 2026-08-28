import asyncio
import os
import sys

# Add the project root to sys.path so we can import backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.core.database import engine

async def main():
    async with engine.connect() as conn:
        version = (await conn.execute(text("SELECT version()"))).scalar()
        esquemas = (await conn.execute(text(
            "SELECT schema_name FROM information_schema.schemata "
            "WHERE schema_name IN ('parametros','erp','ia') ORDER BY 1"
        ))).scalars().all()
        print("SERVIDOR:", version)
        print("ESQUEMAS:", esquemas)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
