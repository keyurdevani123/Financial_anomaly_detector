"""
Groq LLM Client — wrapper for llama-3.3-70b-versatile
"""
from groq import AsyncGroq
from app.core.config import settings

_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


async def groq_chat(
    system: str,
    user: str,
    temperature: float = 0.2,
    max_tokens: int = 1024,
) -> str:
    """Send a chat completion request to Groq and return the response text."""
    client = get_groq_client()
    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""
