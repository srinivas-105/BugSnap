import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user, require_role
from app.models import Bug, Comment, Project, User
from app.schemas import (
    BugCreateBody,
    BugOut,
    BugStatusUpdateBody,
    CommentCreateBody,
    CommentOut,
)

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
VALID_STATUSES = ["open", "in_progress", "ready_for_testing", "resolved", "closed"]


def _get_org_project_or_404(db: Session, project_id: str, organization_id: str) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == organization_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _bug_to_out(db: Session, bug: Bug) -> BugOut:
    project = db.query(Project).filter(Project.id == bug.project_id).first()
    reporter = db.query(User).filter(User.id == bug.reported_by_user_id).first()
    comments = (
        db.query(Comment, User)
        .join(User, Comment.user_id == User.id)
        .filter(Comment.bug_id == bug.id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return BugOut(
        id=bug.id,
        project_id=bug.project_id,
        project_name=project.name if project else "Unknown",
        reported_by_user_id=bug.reported_by_user_id,
        reporter_name=reporter.name if reporter else "Unknown",
        title=bug.title,
        description=bug.description,
        steps_to_reproduce=bug.steps_to_reproduce,
        priority=bug.priority,
        status=bug.status,
        browser=bug.browser,
        operating_system=bug.operating_system,
        device=bug.device,
        screen_resolution=bug.screen_resolution,
        screenshot_url=(f"/uploads/{bug.screenshot_path}" if bug.screenshot_path else None),
        created_at=bug.created_at,
        updated_at=bug.updated_at,
        comments=[
            CommentOut(id=c.id, body=c.body, created_at=c.created_at, user_id=c.user_id, user_name=u.name)
            for c, u in comments
        ],
    )


@router.get("/projects/{project_id}/bugs", response_model=list[BugOut])
def list_project_bugs(
    project_id: str,
    status_filter: str | None = None,
    priority_filter: str | None = None,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_org_project_or_404(db, project_id, current.organization_id)

    q = db.query(Bug).filter(Bug.project_id == project_id)
    if status_filter:
        q = q.filter(Bug.status == status_filter)
    if priority_filter:
        q = q.filter(Bug.priority == priority_filter)

    bugs = q.order_by(Bug.created_at.desc()).all()
    return [_bug_to_out(db, b) for b in bugs]


@router.get("/bugs", response_model=list[BugOut])
def list_all_org_bugs(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """All bugs across every project in the caller's organization."""
    project_ids = [
        p.id for p in db.query(Project.id).filter(Project.organization_id == current.organization_id).all()
    ]
    bugs = (
        db.query(Bug)
        .filter(Bug.project_id.in_(project_ids))
        .order_by(Bug.created_at.desc())
        .all()
    )
    return [_bug_to_out(db, b) for b in bugs]


@router.post("/bugs", response_model=BugOut)
def create_bug(body: BugCreateBody, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_org_project_or_404(db, body.project_id, current.organization_id)

    bug = Bug(
        project_id=body.project_id,
        reported_by_user_id=current.id,
        title=body.title,
        description=body.description,
        steps_to_reproduce=body.steps_to_reproduce,
        priority=body.priority,
        status="open",
        browser=body.browser,
        operating_system=body.operating_system,
        device=body.device,
        screen_resolution=body.screen_resolution,
        ai_conversation=body.ai_conversation,
    )
    db.add(bug)
    db.commit()
    db.refresh(bug)
    return _bug_to_out(db, bug)


@router.get("/bugs/{bug_id}", response_model=BugOut)
def get_bug(bug_id: str, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    bug = db.query(Bug).filter(Bug.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")
    _get_org_project_or_404(db, bug.project_id, current.organization_id)
    return _bug_to_out(db, bug)


@router.patch("/bugs/{bug_id}/status", response_model=BugOut)
def update_bug_status(
    bug_id: str,
    body: BugStatusUpdateBody,
    current: CurrentUser = Depends(require_role("admin", "developer")),
    db: Session = Depends(get_db),
):
    bug = db.query(Bug).filter(Bug.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")
    _get_org_project_or_404(db, bug.project_id, current.organization_id)

    bug.status = body.status
    db.commit()
    db.refresh(bug)
    return _bug_to_out(db, bug)


@router.post("/bugs/{bug_id}/screenshot", response_model=BugOut)
async def upload_screenshot(
    bug_id: str,
    file: UploadFile = File(...),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = db.query(Bug).filter(Bug.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")
    _get_org_project_or_404(db, bug.project_id, current.organization_id)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PNG/JPG/JPEG/GIF/WEBP images are allowed")

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    contents = await file.read()
    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")
    with open(dest, "wb") as f:
        f.write(contents)

    bug.screenshot_path = filename
    db.commit()
    db.refresh(bug)
    return _bug_to_out(db, bug)


@router.post("/bugs/{bug_id}/comments", response_model=BugOut)
def add_comment(
    bug_id: str,
    body: CommentCreateBody,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = db.query(Bug).filter(Bug.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")
    _get_org_project_or_404(db, bug.project_id, current.organization_id)

    comment = Comment(bug_id=bug_id, user_id=current.id, body=body.body)
    db.add(comment)
    db.commit()
    db.refresh(bug)
    return _bug_to_out(db, bug)
