import asyncio
from app.core.database import engine
from sqlalchemy import text
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT count(*) FROM transactions;"))
        print(f"PostgreSQL transaction count: {res.scalar()}")

asyncio.run(main())
