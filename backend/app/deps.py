from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PlatformAdmin, User
from app.security import InvalidToken, verify_token


def _extract_bearer(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")
    return parts[1]


@dataclass
class CurrentUser:
    id: str
    organization_id: str
    role: str
    name: str
    email: str


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> CurrentUser:
    token = _extract_bearer(authorization)
    try:
        payload = verify_token(token)
    except InvalidToken as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    if payload.get("type") != "org_user":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")

    return CurrentUser(
        id=user.id,
        organization_id=user.organization_id,
        role=user.role,
        name=user.name,
        email=user.email,
    )


def require_role(*roles: str):
    def _dep(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires role: {', '.join(roles)}")
        return current

    return _dep


@dataclass
class CurrentPlatformAdmin:
    id: str
    name: str
    email: str


def get_current_platform_admin(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> CurrentPlatformAdmin:
    token = _extract_bearer(authorization)
    try:
        payload = verify_token(token)
    except InvalidToken as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    if payload.get("type") != "platform_admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == payload.get("sub")).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin no longer exists")

    return CurrentPlatformAdmin(id=admin.id, name=admin.name, email=admin.email)
