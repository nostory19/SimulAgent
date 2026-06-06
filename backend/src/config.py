"""
应用配置模块，从环境变量加载所有配置项。

通过 pydantic-settings 自动读取 .env 文件和环境变量，
支持百炼API、ASR模型、数据库路径、日志级别等配置。
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置，所有字段可从 .env 文件或环境变量覆盖。"""

    # ========== 服务器配置 ==========
    HOST: str = "127.0.0.1"
    PORT: int = 8765

    # ========== 阿里云百炼 API（OpenAI 兼容） ==========
    BAILIAN_API_KEY: str = ""
    BAILIAN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    BAILIAN_MODEL: str = "qwen3-8b"

    # ========== 本地 ASR（FunASR） ==========
    ASR_MODEL: str = "iic/SenseVoiceSmall"
    ASR_DEVICE: str = "cpu"

    # ========== 存储路径 ==========
    DATABASE_URL: str = "sqlite+aiosqlite:///../data/simulagent.db"
    MILVUS_DATA_DIR: str = "../data/vectors"

    # ========== 日志 ==========
    LOG_LEVEL: str = "INFO"

    # 配置加载方式：优先读取 .env 文件，其次环境变量
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# 全局单例配置实例
settings = Settings()
