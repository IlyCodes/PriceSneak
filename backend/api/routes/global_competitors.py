from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List

from backend.api.deps import get_db, get_current_user
from backend.models.user import User
from backend.models.competitor import Competitor
from pydantic import BaseModel
from uuid import UUID

class CompetitorResponse(BaseModel):
    id: UUID
    name: str
    domain_url: str

    class Config:
        from_attributes = True

router = APIRouter()

@router.get("/", response_model=List[CompetitorResponse])
def get_global_competitors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Competitor)
    result = db.execute(stmt)
    return result.scalars().all()
