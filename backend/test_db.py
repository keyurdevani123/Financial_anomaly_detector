import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.direct_url.replace("postgresql://", "postgresql+asyncpg://"))
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM transactions"))
        print("Total transactions in DB:", res.scalar())

asyncio.run(main())
