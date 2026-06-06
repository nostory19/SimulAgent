"""
AI 总结 REST API——触发生成和查询会话总结。
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ...models.database import get_db
from ...models.session import CaptureSession
from ...models.transcription import TranscriptionSegment
from ...models.summary import SessionSummary
from ...agents.summary_agent import generate_summary

router = APIRouter(prefix="/api/v1/sessions", tags=["summary"])


@router.post("/{session_id}/summary")
async def create_summary(session_id: str, db: AsyncSession = Depends(get_db)):
    """触发生成会话总结。"""
    # 检查会话存在
    result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "active":
        raise HTTPException(status_code=409, detail="Cannot generate summary for active session")

    # 检查是否已有总结
    exist_result = await db.execute(
        select(SessionSummary).where(SessionSummary.session_id == session_id)
    )
    if exist_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Summary already exists for this session")

    # 获取所有 transcription segments 拼接为全文
    seg_result = await db.execute(
        select(TranscriptionSegment)
        .where(TranscriptionSegment.session_id == session_id)
        .order_by(TranscriptionSegment.sequence_number.asc())
    )
    segments = seg_result.scalars().all()

    if not segments:
        raise HTTPException(status_code=400, detail="No transcription data found")

    # 拼接触发文本（取 source_text）
    transcript = " ".join(s.source_text for s in segments if s.source_text)
    if len(transcript) < 30:
        raise HTTPException(status_code=400, detail="Session too short for summary")

    # 调用百炼生成总结
    summary_data = await generate_summary(transcript)

    # 写入数据库
    summary = SessionSummary(
        id=str(uuid.uuid4()),
        session_id=session_id,
        abstract=summary_data.get("abstract", ""),
        key_viewpoints=summary_data.get("key_viewpoints", []),
        term_glossary=summary_data.get("term_glossary", []),
        action_items=summary_data.get("action_items", []),
        generated_at=datetime.now(timezone.utc),
    )
    db.add(summary)
    await db.commit()

    return {
        "summary_id": summary.id,
        "session_id": session_id,
        **summary_data,
        "generated_at": summary.generated_at.isoformat(),
    }


@router.get("/{session_id}/summary")
async def get_summary(session_id: str, db: AsyncSession = Depends(get_db)):
    """获取已有总结。"""
    result = await db.execute(
        select(SessionSummary).where(SessionSummary.session_id == session_id)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="No summary found")

    return {
        "summary_id": summary.id,
        "session_id": session_id,
        "abstract": summary.abstract,
        "key_viewpoints": summary.key_viewpoints,
        "term_glossary": summary.term_glossary,
        "action_items": summary.action_items,
        "generated_at": summary.generated_at.isoformat() if summary.generated_at else None,
    }
