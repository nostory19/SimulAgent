"""术语库 API——增删改查、搜索、导出。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from pydantic import BaseModel
from typing import Optional
from ...models.database import get_db
from ...models.terminology import TerminologyEntry

router = APIRouter(prefix="/api/v1/glossary", tags=["glossary"])


# ===== 请求/响应模型 =====

class TermCreate(BaseModel):
    source_term: str
    standard_translation: str
    domain: Optional[str] = None


class TermUpdate(BaseModel):
    source_term: Optional[str] = None
    standard_translation: Optional[str] = None
    domain: Optional[str] = None


class TermResponse(BaseModel):
    id: str
    source_term: str
    standard_translation: str
    domain: Optional[str]
    hit_count: int


class GlossaryListResponse(BaseModel):
    terms: list[TermResponse]
    total: int


# ===== API 端点 =====

@router.get("", response_model=GlossaryListResponse)
async def list_terms(
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """列出所有全局术语，支持按关键词搜索。"""
    query = select(TerminologyEntry).where(TerminologyEntry.session_id.is_(None))
    if q:
        pattern = f"%{q}%"
        query = query.where(
            TerminologyEntry.source_term.ilike(pattern)
            | TerminologyEntry.standard_translation.ilike(pattern)
        )
    query = query.order_by(TerminologyEntry.created_at.desc())

    result = await db.execute(query)
    rows = result.scalars().all()
    return GlossaryListResponse(
        terms=[TermResponse(
            id=r.id, source_term=r.source_term,
            standard_translation=r.standard_translation,
            domain=r.domain, hit_count=r.hit_count or 0,
        ) for r in rows],
        total=len(rows),
    )


@router.post("", response_model=TermResponse, status_code=201)
async def create_term(req: TermCreate, db: AsyncSession = Depends(get_db)):
    """创建新术语。"""
    term = TerminologyEntry(
        source_term=req.source_term.strip(),
        standard_translation=req.standard_translation.strip(),
        domain=req.domain.strip() if req.domain else None,
        session_id=None,  # 全局术语
    )
    db.add(term)
    await db.commit()
    await db.refresh(term)
    return TermResponse(
        id=term.id, source_term=term.source_term,
        standard_translation=term.standard_translation,
        domain=term.domain, hit_count=0,
    )


@router.put("/{term_id}", response_model=TermResponse)
async def update_term(term_id: str, req: TermUpdate, db: AsyncSession = Depends(get_db)):
    """修改术语。"""
    result = await db.execute(
        select(TerminologyEntry).where(
            TerminologyEntry.id == term_id,
            TerminologyEntry.session_id.is_(None),
        )
    )
    term = result.scalar_one_or_none()
    if not term:
        raise HTTPException(status_code=404, detail="术语不存在")

    if req.source_term is not None:
        term.source_term = req.source_term.strip()
    if req.standard_translation is not None:
        term.standard_translation = req.standard_translation.strip()
    if req.domain is not None:
        term.domain = req.domain.strip() if req.domain else None

    await db.commit()
    await db.refresh(term)
    return TermResponse(
        id=term.id, source_term=term.source_term,
        standard_translation=term.standard_translation,
        domain=term.domain, hit_count=term.hit_count or 0,
    )


@router.delete("/{term_id}", status_code=204)
async def delete_term(term_id: str, db: AsyncSession = Depends(get_db)):
    """删除术语。"""
    result = await db.execute(
        delete(TerminologyEntry).where(
            TerminologyEntry.id == term_id,
            TerminologyEntry.session_id.is_(None),
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="术语不存在")
    await db.commit()


@router.get("/export")
async def export_terms(db: AsyncSession = Depends(get_db)):
    """导出所有全局术语为 {source: translation} dict，供翻译引擎使用。"""
    result = await db.execute(
        select(TerminologyEntry.source_term, TerminologyEntry.standard_translation)
        .where(TerminologyEntry.session_id.is_(None))
    )
    return {row[0]: row[1] for row in result.all()}
