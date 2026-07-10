"""
Runs once at startup. Guarantees the app is instantly demo-able:
  - A platform admin account always exists (BugSnap's own super-admin).
  - A demo organization with a couple of projects/websites and a couple of
    sample bugs exists, so a fresh clone isn't a completely empty screen.

All of this is idempotent — safe to run on every startup.
"""

import os

from sqlalchemy.orm import Session

from app.models import Bug, Organization, PlatformAdmin, Project, User
from app.security import hash_password

PLATFORM_ADMIN_EMAIL = os.getenv("PLATFORM_ADMIN_EMAIL", "owner@bugsnap.dev")
PLATFORM_ADMIN_PASSWORD = os.getenv("PLATFORM_ADMIN_PASSWORD", "BugSnapOwner123!")
PLATFORM_ADMIN_NAME = os.getenv("PLATFORM_ADMIN_NAME", "BugSnap Founder")


def seed(db: Session) -> None:
    _seed_platform_admin(db)
    _seed_demo_org(db)
    db.commit()


def _seed_platform_admin(db: Session) -> None:
    existing = db.query(PlatformAdmin).filter(PlatformAdmin.email == PLATFORM_ADMIN_EMAIL).first()
    if existing:
        return
    admin = PlatformAdmin(
        name=PLATFORM_ADMIN_NAME,
        email=PLATFORM_ADMIN_EMAIL,
        password_hash=hash_password(PLATFORM_ADMIN_PASSWORD),
    )
    db.add(admin)


def _seed_demo_org(db: Session) -> None:
    existing = db.query(Organization).filter(Organization.workspace_code == "DEMOCORP").first()
    if existing:
        return

    org = Organization(name="DemoCorp Technologies", workspace_code="DEMOCORP", org_type="company")
    db.add(org)
    db.flush()

    admin = User(
        organization_id=org.id,
        name="Asha Rao",
        email="admin@democorp.dev",
        password_hash=hash_password("Demo123!"),
        role="admin",
        is_active=True,
    )
    developer = User(
        organization_id=org.id,
        name="Rahul Mehta",
        email="dev@democorp.dev",
        password_hash=hash_password("Demo123!"),
        role="developer",
        is_active=True,
    )
    tester = User(
        organization_id=org.id,
        name="Priya Nair",
        email="tester@democorp.dev",
        password_hash=hash_password("Demo123!"),
        role="tester",
        is_active=True,
    )
    db.add_all([admin, developer, tester])
    db.flush()

    marketing_site = Project(
        organization_id=org.id,
        name="Marketing Website",
        url="https://www.democorp.com",
        description="Public marketing site: homepage, pricing, blog.",
    )
    employee_portal = Project(
        organization_id=org.id,
        name="Employee Portal",
        url="https://portal.democorp.com",
        description="Internal HR and payroll dashboard for employees.",
    )
    mobile_app = Project(
        organization_id=org.id,
        name="DemoCorp Mobile App",
        url="https://apps.democorp.com/mobile",
        description="iOS and Android customer-facing app.",
    )
    db.add_all([marketing_site, employee_portal, mobile_app])
    db.flush()

    sample_bugs = [
        Bug(
            project_id=marketing_site.id,
            reported_by_user_id=tester.id,
            title="Login button doesn't respond",
            description="Clicking the login button on the homepage does nothing. No error, no redirect.",
            steps_to_reproduce="1. Open Login Page\n2. Enter Email\n3. Enter Password\n4. Click Login\n5. Nothing happens",
            priority="critical",
            status="open",
            browser="Chrome 126",
            operating_system="Windows 11",
            device="Desktop",
            screen_resolution="1920x1080",
        ),
        Bug(
            project_id=employee_portal.id,
            reported_by_user_id=tester.id,
            title="Payslip PDF download fails on Safari",
            description="Downloading a payslip as PDF throws a blank page in Safari only.",
            steps_to_reproduce="1. Log in on Safari\n2. Go to Payslips\n3. Click Download PDF\n4. Blank tab opens",
            priority="high",
            status="in_progress",
            browser="Safari 17",
            operating_system="macOS Sonoma",
            device="MacBook Pro",
            screen_resolution="2560x1600",
        ),
        Bug(
            project_id=mobile_app.id,
            reported_by_user_id=admin.id,
            title="Push notifications arrive twice",
            description="Order confirmation push notifications are duplicated on Android.",
            steps_to_reproduce="1. Place an order\n2. Wait for confirmation push\n3. Notification appears twice",
            priority="medium",
            status="resolved",
            browser=None,
            operating_system="Android 14",
            device="Pixel 8",
            screen_resolution="1080x2400",
        ),
    ]
    db.add_all(sample_bugs)
