"""
会话管理 REST API 路由。

提供采集会话的 CRUD 操作和字幕历史查询。
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ...models.database import get_db
from ...models.session import CaptureSession
from ...models.transcription import TranscriptionSegment
from ...models.translation import TranslationEntry

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


@router.get("")
async def list_sessions(limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db)):
    """获取会话列表，按创建时间倒序。"""
    result = await db.execute(
        select(CaptureSession)
        .order_by(CaptureSession.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    sessions = result.scalars().all()

    count_result = await db.execute(select(func.count(CaptureSession.id)))
    total = count_result.scalar() or 0

    return {
        "sessions": [
            {
                "id": s.id,
                "title": s.title,
                "source_language": s.source_language,
                "target_language": s.target_language,
                "display_mode": s.display_mode,
                "status": s.status,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "duration_seconds": s.duration_seconds,
                "total_segments": s.total_segments,
            }
            for s in sessions
        ],
        "total": total,
    }


@router.get("/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个会话详情。"""
    result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 统计修正过的 segment 数量
    revised_result = await db.execute(
        select(func.count(TranslationEntry.id))
        .where(TranslationEntry.session_id == session_id, TranslationEntry.is_revised == True)
    )
    revised_count = revised_result.scalar() or 0

    # 统计是否有总结
    from ...models.summary import SessionSummary as Summary
    summary_result = await db.execute(
        select(func.count(Summary.id)).where(Summary.session_id == session_id)
    )
    has_summary = (summary_result.scalar() or 0) > 0

    return {
        "id": session.id,
        "title": session.title,
        "source_language": session.source_language,
        "target_language": session.target_language,
        "display_mode": session.display_mode,
        "status": session.status,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "duration_seconds": session.duration_seconds,
        "total_segments": session.total_segments,
        "revised_segments": revised_count,
        "has_summary": has_summary,
    }


@router.delete("/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """删除会话及关联的所有数据。"""
    result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()
    return {"deleted": True, "session_id": session_id}


@router.get("/{session_id}/subtitles")
async def get_subtitles(
    session_id: str,
    limit: int = 100,
    offset: int = 0,
    order: str = "asc",
    db: AsyncSession = Depends(get_db),
):
    """获取会话的字幕历史列表。"""
    # 验证会话存在
    session_result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == session_id)
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    # 查询翻译条目（通过 segment 关联获取源文本和时间信息）
    query = (
        select(TranslationEntry)
        .where(TranslationEntry.session_id == session_id)
    )
    if order == "asc":
        query = query.order_by(TranslationEntry.created_at.asc())
    else:
        query = query.order_by(TranslationEntry.created_at.desc())

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    entries = result.scalars().all()

    # 获取总数
    count_stmt = select(func.count(TranslationEntry.id)).where(
        TranslationEntry.session_id == session_id
    )
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # 序列化字幕条目
    subtitles = []
    for entry in entries:
        # 获取关联的 transcription segment 信息
        seg_result = await db.execute(
            select(TranscriptionSegment).where(TranscriptionSegment.id == entry.segment_id)
        )
        segment = seg_result.scalar_one_or_none()

        subtitles.append({
            "id": entry.id,
            "sequence_number": segment.sequence_number if segment else 0,
            "source_text": segment.source_text if segment else "",
            "translated_text": entry.translated_text,
            "is_revised": entry.is_revised,
            "revision_count": entry.revision_count,
            "revision_history": entry.revision_history,
            "start_time_ms": segment.start_time_ms if segment else 0,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        })

    return {
        "session_id": session_id,
        "subtitles": subtitles,
        "total": total,
    }
