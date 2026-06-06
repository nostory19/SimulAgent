"""
术语条目数据模型 (TerminologyEntry)。

存储从用户上传的参考文档中提取的专业术语及其标准中文翻译，
支持向量嵌入用于 RAG 语义检索。
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.sqlite import BLOB
from .database import Base


def _gen_uuid():
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


class TerminologyEntry(Base):
    """专业术语表，存储领域术语与其标准翻译的映射。"""

    __tablename__ = "terminology_entries"

    id = Column(String(36), primary_key=True, default=_gen_uuid)

    # session_id 为 null 时表示全局术语（跨会话可用）
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), nullable=True)

    # ===== 术语映射 =====
    source_term = Column(String(500), nullable=False)  # 原文术语（如 "backpropagation"）
    standard_translation = Column(String(500), nullable=False)  # 标准中文翻译（如 "反向传播"）
    domain = Column(String(100), nullable=True)  # 领域标签（medical/tech/legal）

    # ===== 来源追踪 =====
    source_document = Column(String(255), nullable=True)  # 来源于哪个上传文件
    embedding = Column(BLOB, nullable=True)  # source_term 的向量嵌入（用于 Milvus 检索）
    hit_count = Column(Integer, default=0)  # 翻译过程中被匹配使用的次数

    created_at = Column(DateTime, nullable=False, default=_utcnow)
