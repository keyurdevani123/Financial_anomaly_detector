from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Use direct_url to bypass PgBouncer since SQLAlchemy manages its own pool
db_url = settings.direct_url or settings.database_url
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_async_engine(
    db_url,
    echo=False,  # Always off — reduces log noise on Render
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,      # Detect stale connections (important for Render free)
    pool_recycle=1800,       # Recycle connections every 30min
    connect_args={} if "postgresql" in db_url else {"check_same_thread": False},
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
