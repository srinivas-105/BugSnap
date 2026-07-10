from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai_assistant import run_assistant
from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models import Project
from app.schemas import AiAssistBody, AiAssistResponse

router = APIRouter()


@router.post("/ai/assist", response_model=AiAssistResponse)
def ai_assist(body: AiAssistBody, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .filter(Project.organization_id == current.organization_id)
        .all()
    )
    project_dicts = [
        {"id": p.id, "name": p.name, "url": p.url, "description": p.description} for p in projects
    ]

    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    result = run_assistant(messages, project_dicts)

    return AiAssistResponse(**result)
