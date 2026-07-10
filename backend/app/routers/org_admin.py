from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, require_role
from app.models import Bug, Project, User
from app.schemas import OrgUserCreateBody, UserOut
from app.security import hash_password

router = APIRouter()


@router.get("/organizations/users", response_model=list[UserOut])
def list_org_users(current: CurrentUser = Depends(require_role("admin")), db: Session = Depends(get_db)):
    users = (
        db.query(User)
        .filter(User.organization_id == current.organization_id)
        .order_by(User.created_at.desc())
        .all()
    )
    return [UserOut.model_validate(u) for u in users]


@router.post("/organizations/users", response_model=UserOut)
def add_org_user(
    body: OrgUserCreateBody,
    current: CurrentUser = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin invites a teammate by email + role only. No password is set
    here — the invited person must go to the Register page, enter the
    workspace code and this exact email, and choose their own name &
    password. Until they do that, the account is 'is_active=False' and
    cannot log in, so only people the admin explicitly invited can ever
    get into the workspace."""

    existing = (
        db.query(User)
        .filter(User.email == body.email.lower(), User.organization_id == current.organization_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists")

    user = User(
        organization_id=current.organization_id,
        name=body.name or body.email.split("@")[0],
        email=body.email.lower(),
        password_hash=None,
        role=body.role,
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/organizations/users/{user_id}")
def remove_org_user(
    user_id: str,
    current: CurrentUser = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="You cannot remove your own account")

    user = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == current.organization_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return {"success": True}


@router.get("/organizations/stats")
def org_stats(current: CurrentUser = Depends(require_role("admin")), db: Session = Depends(get_db)):
    user_count = db.query(User).filter(User.organization_id == current.organization_id).count()
    project_ids = [p.id for p in db.query(Project.id).filter(Project.organization_id == current.organization_id).all()]
    project_count = len(project_ids)
    bug_count = db.query(Bug).filter(Bug.project_id.in_(project_ids)).count() if project_ids else 0
    open_bugs = (
        db.query(Bug).filter(Bug.project_id.in_(project_ids), Bug.status == "open").count() if project_ids else 0
    )
    resolved_bugs = (
        db.query(Bug).filter(Bug.project_id.in_(project_ids), Bug.status == "resolved").count() if project_ids else 0
    )
    return {
        "user_count": user_count,
        "project_count": project_count,
        "bug_count": bug_count,
        "open_bugs": open_bugs,
        "resolved_bugs": resolved_bugs,
    }
