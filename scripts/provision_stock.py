import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        await session.execute(text("SET LOCAL app.kardex_interno = 'on';"))
        await session.execute(text("UPDATE erp.producto SET stock_actual = stock_actual + 10000 WHERE id_producto BETWEEN 1 AND 30;"))
        await session.commit()
        print("Stock successfully provisioned for products 1-30 (+10,000 units each).")

if __name__ == "__main__":
    asyncio.run(main())
