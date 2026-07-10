from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models import Organization, PlatformAdmin, User
from app.schemas import (
    AuthResponse,
    LoginBody,
    OrganizationOut,
    PlatformAdminLoginBody,
    RegisterBody,
    SignupOrgBody,
    UserOut,
)
from app.security import create_token, hash_password, verify_password

router = APIRouter()


@router.post("/signup-organization", response_model=AuthResponse)
def signup_organization(body: SignupOrgBody, db: Session = Depends(get_db)):
    code = body.workspace_code.strip().upper()

    existing = db.query(Organization).filter(Organization.workspace_code == code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Workspace code is already taken")

    existing_email = db.query(User).filter(User.email == body.email.lower()).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    org = Organization(name=body.organization_name, workspace_code=code, org_type=body.org_type)
    db.add(org)
    db.flush()

    admin_user = User(
        organization_id=org.id,
        name=body.admin_name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role="admin",
        is_active=True,
        last_login_at=datetime.utcnow(),
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    db.refresh(org)

    token = create_token({"sub": admin_user.id, "type": "org_user"})
    return AuthResponse(
        access_token=token,
        user=UserOut.model_validate(admin_user),
        organization=OrganizationOut.model_validate(org),
        is_first_login=True,
    )


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterBody, db: Session = Depends(get_db)):
    """Second step of the invite flow. An admin must have already added this
    exact email to the workspace (via /organizations/users) before someone
    can register with it. This is what keeps a workspace closed to only the
    people the admin explicitly invited."""

    code = body.workspace_code.strip().upper()
    org = db.query(Organization).filter(Organization.workspace_code == code).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace code not found")

    invited_user = (
        db.query(User)
        .filter(User.email == body.email.lower(), User.organization_id == org.id)
        .first()
    )
    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email hasn't been invited to this workspace. Ask your admin to add it first.",
        )
    if invited_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is already registered. Please log in instead.",
        )

    invited_user.name = body.name
    invited_user.password_hash = hash_password(body.password)
    invited_user.is_active = True
    invited_user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(invited_user)

    token = create_token({"sub": invited_user.id, "type": "org_user"})
    return AuthResponse(
        access_token=token,
        user=UserOut.model_validate(invited_user),
        organization=OrganizationOut.model_validate(org),
        is_first_login=True,
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginBody, db: Session = Depends(get_db)):
    code = body.workspace_code.strip().upper()
    org = db.query(Organization).filter(Organization.workspace_code == code).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace code not found")

    user = (
        db.query(User)
        .filter(User.email == body.email.lower(), User.organization_id == org.id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account hasn't been registered yet. Use the 'Register' link with the email your admin gave you.",
        )

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    is_first_login = user.last_login_at is None
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    token = create_token({"sub": user.id, "type": "org_user"})
    return AuthResponse(
        access_token=token,
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
        is_first_login=is_first_login,
    )


@router.get("/me", response_model=AuthResponse)
def me(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current.id).first()
    org = db.query(Organization).filter(Organization.id == current.organization_id).first()
    if not user or not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    token = create_token({"sub": user.id, "type": "org_user"})
    return AuthResponse(
        access_token=token,
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
        is_first_login=False,
    )


@router.post("/platform-admin/login")
def platform_admin_login(body: PlatformAdminLoginBody, db: Session = Depends(get_db)):
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.email == body.email.lower()).first()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_token({"sub": admin.id, "type": "platform_admin"})
    return {
        "access_token": token,
        "admin": {"id": admin.id, "name": admin.name, "email": admin.email},
    }
