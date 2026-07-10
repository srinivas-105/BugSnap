from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Role = Literal["admin", "developer", "tester"]
Priority = Literal["low", "medium", "high", "critical"]
Status = Literal["open", "in_progress", "ready_for_testing", "resolved", "closed"]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class SignupOrgBody(BaseModel):
    organization_name: str = Field(min_length=2, max_length=120)
    workspace_code: str = Field(min_length=2, max_length=40)
    org_type: Literal["company", "college", "other"] = "company"
    admin_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginBody(BaseModel):
    workspace_code: str
    email: EmailStr
    password: str


class RegisterBody(BaseModel):
    workspace_code: str
    email: EmailStr
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=128)


class PlatformAdminLoginBody(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    organization_id: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    user: UserOut
    organization: "OrganizationOut"
    is_first_login: bool = False


# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------

class OrganizationOut(BaseModel):
    id: str
    name: str
    workspace_code: str
    org_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationWithStats(OrganizationOut):
    user_count: int
    project_count: int
    bug_count: int


# ---------------------------------------------------------------------------
# Org users (invite)
# ---------------------------------------------------------------------------

class OrgUserCreateBody(BaseModel):
    """Admin invites a teammate by email only — the teammate sets their own
    name & password when they register with this exact email + the
    workspace code."""

    email: EmailStr
    role: Role
    name: Optional[str] = None


# ---------------------------------------------------------------------------
# Projects (websites/apps)
# ---------------------------------------------------------------------------

class ProjectCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    url: Optional[str] = None
    description: Optional[str] = None


class BugCounts(BaseModel):
    open: int = 0
    in_progress: int = 0
    ready_for_testing: int = 0
    resolved: int = 0
    closed: int = 0


class ProjectOut(BaseModel):
    id: str
    name: str
    url: Optional[str]
    description: Optional[str]
    created_at: datetime
    bug_counts: BugCounts

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Bugs
# ---------------------------------------------------------------------------

class BugCreateBody(BaseModel):
    project_id: str
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    steps_to_reproduce: Optional[str] = None
    priority: Priority = "medium"
    browser: Optional[str] = None
    operating_system: Optional[str] = None
    device: Optional[str] = None
    screen_resolution: Optional[str] = None
    ai_conversation: Optional[str] = None


class BugStatusUpdateBody(BaseModel):
    status: Status


class CommentCreateBody(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: str
    body: str
    created_at: datetime
    user_id: str
    user_name: str

    class Config:
        from_attributes = True


class BugOut(BaseModel):
    id: str
    project_id: str
    project_name: str
    reported_by_user_id: str
    reporter_name: str
    title: str
    description: Optional[str]
    steps_to_reproduce: Optional[str]
    priority: Priority
    status: Status
    browser: Optional[str]
    operating_system: Optional[str]
    device: Optional[str]
    screen_resolution: Optional[str]
    screenshot_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    comments: list[CommentOut] = []


# ---------------------------------------------------------------------------
# AI Assistant
# ---------------------------------------------------------------------------

class AiChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AiAssistBody(BaseModel):
    messages: list[AiChatMessage]
    selected_project_id: Optional[str] = None


class AiExtracted(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    steps_to_reproduce: Optional[str] = None
    priority: Optional[Priority] = None
    project_id: Optional[str] = None
    project_name_guess: Optional[str] = None


class AiAssistResponse(BaseModel):
    message: str
    done: bool
    extracted: AiExtracted
    ai_powered: bool  # True if a real Gemini call was used, False if fallback logic ran


AuthResponse.model_rebuild()
