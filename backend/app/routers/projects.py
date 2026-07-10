from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models import Bug, Project
from app.schemas import BugCounts, ProjectCreateBody, ProjectOut

router = APIRouter()

STATUS_KEYS = ["open", "in_progress", "ready_for_testing", "resolved", "closed"]


def _project_to_out(db: Session, project: Project) -> ProjectOut:
    counts = {k: 0 for k in STATUS_KEYS}
    bugs = db.query(Bug.status).filter(Bug.project_id == project.id).all()
    for (s,) in bugs:
        if s in counts:
            counts[s] += 1
    return ProjectOut(
        id=project.id,
        name=project.name,
        url=project.url,
        description=project.description,
        created_at=project.created_at,
        bug_counts=BugCounts(**counts),
    )


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .filter(Project.organization_id == current.organization_id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return [_project_to_out(db, p) for p in projects]


@router.post("/projects", response_model=ProjectOut)
def create_project(
    body: ProjectCreateBody,
    current: CurrentUser = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    project = Project(
        organization_id=current.organization_id,
        name=body.name,
        url=body.url,
        description=body.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _project_to_out(db, project)


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == current.organization_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _project_to_out(db, project)


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    current: CurrentUser = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == current.organization_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"success": True}
