"""
Google Gemini Embeddings Service
Uses text-embedding-004 to generate 768-dim embeddings for Pinecone.
"""
import asyncio
import google.generativeai as genai
from app.core.config import settings

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


async def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding for `text` using Gemini text-embedding-004.
    Returns a list of floats (768 dimensions).
    """
    _ensure_configured()
    # Run synchronous genai call in thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: genai.embed_content(
            model=settings.gemini_embedding_model,
            content=text,
            task_type="retrieval_query",
            output_dimensionality=768,
        ),
    )
    return result["embedding"]


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts."""
    tasks = [get_embedding(text) for text in texts]
    return await asyncio.gather(*tasks)
