"""
FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────
    print("🚀 Starting Financial Anomaly Investigation Agent...")

    # 1. Initialize DB (create tables if not exist)
    await init_db()
    print("✅ Database initialized")

    # 2. Warm up Pinecone index (non-blocking)
    try:
        from app.services.pinecone_service import get_index, seed_demo_cases
        get_index()  # Initialize index connection
        print("✅ Pinecone index connected")
        # Seed demo cases if index is empty
        try:
            from app.services.pinecone_service import get_index_stats
            stats = await get_index_stats()
            if stats.get("total_vector_count", 0) < 5:
                print("⚠️  Pinecone index empty, seeding demo cases...")
                await seed_demo_cases()
            else:
                print(f"✅ Pinecone index has {stats.get('total_vector_count')} vectors")
        except Exception as e:
            print(f"⚠️  Pinecone stats check skipped: {e}")
    except Exception as e:
        print(f"⚠️  Pinecone startup skipped: {e}")

    # 3. Pre-warm the LangGraph graph (compile once)
    try:
        from app.agents.graph import investigation_graph
        print("✅ LangGraph agent graph compiled and ready")
    except Exception as e:
        print(f"⚠️  LangGraph warmup failed: {e}")

    print("✅ All systems operational")
    yield

    # ── Shutdown ───────────────────────────────────────────────────
    print("👋 Shutting down Financial Anomaly Agent...")


app = FastAPI(
    title="Financial Anomaly Investigation Agent",
    description=(
        "Autonomous LangGraph-powered agent that investigates financial transaction "
        "anomalies using Groq (LLaMA 3.3), Gemini embeddings, and Pinecone RAG. "
        "Features a self-scoring reflection loop and real fraud dataset integration."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────
app.include_router(anomalies_router, prefix="/api/v1")
app.include_router(transactions_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint — used by Render keep-alive monitoring."""
    return {"status": "healthy", "version": settings.app_version}
