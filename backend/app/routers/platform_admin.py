from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentPlatformAdmin, get_current_platform_admin
from app.models import Bug, Organization, Project, User
from app.schemas import OrganizationWithStats

router = APIRouter()


@router.get("/platform/organizations", response_model=list[OrganizationWithStats])
def list_all_organizations(
    _: CurrentPlatformAdmin = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    out = []
    for org in orgs:
        user_count = db.query(User).filter(User.organization_id == org.id).count()
        project_ids = [p.id for p in db.query(Project.id).filter(Project.organization_id == org.id).all()]
        project_count = len(project_ids)
        bug_count = db.query(Bug).filter(Bug.project_id.in_(project_ids)).count() if project_ids else 0
        out.append(
            OrganizationWithStats(
                id=org.id,
                name=org.name,
                workspace_code=org.workspace_code,
                org_type=org.org_type,
                created_at=org.created_at,
                user_count=user_count,
                project_count=project_count,
                bug_count=bug_count,
            )
        )
    return out


@router.get("/platform/stats")
def platform_stats(
    _: CurrentPlatformAdmin = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    return {
        "organization_count": db.query(Organization).count(),
        "user_count": db.query(User).count(),
        "project_count": db.query(Project).count(),
        "bug_count": db.query(Bug).count(),
        "open_bugs": db.query(Bug).filter(Bug.status == "open").count(),
        "resolved_bugs": db.query(Bug).filter(Bug.status == "resolved").count(),
    }


@router.delete("/platform/organizations/{org_id}")
def delete_organization(
    org_id: str,
    _: CurrentPlatformAdmin = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    db.delete(org)
    db.commit()
    return {"success": True}
