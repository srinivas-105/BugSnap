import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    Boolean,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class PlatformAdmin(Base):
    """The BugSnap product owner. Not tied to any organization."""

    __tablename__ = "platform_admins"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Organization(Base):
    """A company / college / hospital that signs up for its own workspace."""

    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    workspace_code = Column(String, unique=True, nullable=False, index=True)
    org_type = Column(String, default="company")  # company | college | other
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    """A member of an organization: admin, developer, or tester."""

    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    password_hash = Column(String, nullable=True)  # null until the invited user registers
    role = Column(String, nullable=False, default="tester")  # admin | developer | tester
    is_active = Column(Boolean, nullable=False, default=True)  # False = invited, not registered yet
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    bugs_reported = relationship("Bug", back_populates="reporter", foreign_keys="Bug.reported_by_user_id")


class Project(Base):
    """A website / app / product that belongs to an organization.

    An organization can register multiple projects (e.g. "Marketing Site",
    "Employee Portal", "Mobile App") — this is what lets the AI assistant
    figure out *which* website a reported bug actually belongs to.
    """

    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_id)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="projects")
    bugs = relationship("Bug", back_populates="project", cascade="all, delete-orphan")


class Bug(Base):
    __tablename__ = "bugs"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    reported_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    steps_to_reproduce = Column(Text, nullable=True)

    priority = Column(String, default="medium")  # low | medium | high | critical
    status = Column(String, default="open")  # open | in_progress | ready_for_testing | resolved | closed

    browser = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    device = Column(String, nullable=True)
    screen_resolution = Column(String, nullable=True)

    screenshot_path = Column(String, nullable=True)
    ai_conversation = Column(Text, nullable=True)  # JSON-encoded transcript, for traceability

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="bugs")
    reporter = relationship("User", back_populates="bugs_reported", foreign_keys=[reported_by_user_id])
    comments = relationship("Comment", back_populates="bug", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=gen_id)
    bug_id = Column(String, ForeignKey("bugs.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bug = relationship("Bug", back_populates="comments")
    user = relationship("User")
