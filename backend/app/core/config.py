from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App
    app_name: str = "Financial Anomaly Investigation Agent"
    app_version: str = "1.0.0"
    debug: bool = False
    allowed_origins: str = "*"

    # Groq LLM
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    # Gemini Embeddings
    gemini_api_key: str
    gemini_embedding_model: str = "models/gemini-embedding-001"

    # Pinecone
    pinecone_api_key: str
    pinecone_index_name: str = "fraud-cases-v2"
    pinecone_environment: str = "us-east-1"

    # Database
    database_url: str
    direct_url: str | None = None

    # Agent / Reflection Loop
    reflection_confidence_threshold: float = 0.8
    reflection_max_retries: int = 2  # Reduced from 3 for Render free tier speed

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return not self.debug

    model_config = {"env_file": ("../.env", ".env"), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
