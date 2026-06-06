"""Application configuration loaded from environment variables."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8765

    # Bailian API (OpenAI-compatible)
    BAILIAN_API_KEY: str = ""
    BAILIAN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    BAILIAN_MODEL: str = "qwen3-8b"

    # ASR (local FunASR)
    ASR_MODEL: str = "paraformer-zh-streaming"
    ASR_DEVICE: str = "cpu"

    # Storage
    DATABASE_URL: str = "sqlite+aiosqlite:///../data/simulagent.db"
    MILVUS_DATA_DIR: str = "../data/vectors"

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
