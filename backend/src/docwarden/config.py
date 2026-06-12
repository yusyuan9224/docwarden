"""全域設定:環境變數前綴 DOCWARDEN_。"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DOCWARDEN_", env_file=".env", extra="ignore")

    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "qwen2.5:7b"
    embed_model: str = "bge-m3"
    embed_dim: int = 1024

    qdrant_url: str | None = None
    collection_name: str = "docwarden_chunks"
    db_path: str = "docwarden.db"

    llm_timeout: float = 300.0
    llm_retries: int = 3

    # 拒答 Layer 1:檢索最高分(cosine)低於此值 → 該次搜尋視為查無資料
    refusal_score_threshold: float = 0.55
    search_top_k: int = 4
    max_agent_steps: int = 4

    chunk_size: int = 450
    chunk_overlap: int = 60

    # widget 允許的跨域來源("*" 表示任意網站皆可嵌入)
    widget_allow_origins: str = "*"


settings = Settings()
