import asyncio
from app.core.database import engine
from sqlalchemy import text
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE transactions ALTER COLUMN transaction_type TYPE VARCHAR(50) USING transaction_type::text;"))
        await conn.execute(text("ALTER TABLE transactions ALTER COLUMN risk_level TYPE VARCHAR(50) USING risk_level::text;"))
        print("Migrated enums to VARCHAR successfully!")

asyncio.run(main())
