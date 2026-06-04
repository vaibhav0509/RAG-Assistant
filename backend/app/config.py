from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM provider: "ollama" (local) or "groq" (cloud)
    llm_provider: str = "ollama"

    # Ollama (used when llm_provider=ollama)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "granite4.1:8b"

    # Groq (used when llm_provider=groq)
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    # Vector store
    chroma_persist_dir: str = "./chroma_db"

    # Embedding (always local — sentence-transformers)
    embedding_model: str = "all-MiniLM-L6-v2"

    # Chunking defaults
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_results: int = 5

    # Auth
    api_key: str = "enterprise-rag-secret"

    class Config:
        env_file = ".env"


settings = Settings()
