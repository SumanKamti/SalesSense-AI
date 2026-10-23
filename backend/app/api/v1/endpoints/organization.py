from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.invitation import Invitation
from app.core.security import get_current_user, require_admin, require_admin_or_manager
from app.schemas.organization import (
    OrganizationResponse,
    InvitationCreate,
    InvitationResponse,
    TeamMemberResponse,
    TeamMemberRoleUpdate,
    TeamStatsResponse,
)
from app.services.organization_service import (
    generate_invite,
    get_team_members,
    get_team_stats,
)

router = APIRouter()


@router.get("/", response_model=OrganizationResponse)
def get_current_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details of the authenticated user's organization."""
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of any organization.",
        )

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    member_count = db.query(User).filter(User.organization_id == org.id).count()

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "created_at": org.created_at,
        "member_count": member_count,
    }


@router.get("/team", response_model=List[TeamMemberResponse])
def list_team_members(
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    """List all team members and their activity metrics in the organization."""
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must belong to an organization to view team members.",
        )

    return get_team_members(db, current_user.organization_id)


@router.post("/invite", response_model=InvitationResponse)
def create_invite(
    invite_in: InvitationCreate,
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Generate an invitation code for a new member.
    
    Role Hierarchy Enforcement:
    - Admins can invite: "manager" or "rep".
    - Managers can ONLY invite: "rep" (cannot create peers or escalate privileges to admin).
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must belong to an organization to invite members.",
        )

    # Hierarchical rule: Managers can only invite reps
    if current_user.role == "manager" and invite_in.role != "rep":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only invite sales representatives. Only administrators can invite managers or administrators.",
        )

    invitation = generate_invite(
        db=db,
        org_id=current_user.organization_id,
        role=invite_in.role,
        email=invite_in.email,
        max_uses=invite_in.max_uses,
        custom_code=invite_in.custom_code,
    )
    return invitation


@router.get("/invitations", response_model=List[InvitationResponse])
def list_invitations(
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    """List pending and active invitations for the organization."""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="No organization assigned.")

    query = db.query(Invitation).filter(Invitation.organization_id == current_user.organization_id)
    
    # If manager, show rep invitations so they can track links they manage
    if current_user.role == "manager":
        query = query.filter(Invitation.role == "rep")

    invites = query.order_by(Invitation.created_at.desc()).all()
    return invites


@router.delete("/invite/{invite_id}")
def revoke_invite(
    invite_id: int,
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Revoke an unused invitation."""
    invitation = (
        db.query(Invitation)
        .filter(
            Invitation.id == invite_id,
            Invitation.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    # Hierarchical rule: Managers cannot revoke admin or manager invite links
    if current_user.role == "manager" and invitation.role != "rep":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers cannot revoke manager or administrator invite links.",
        )

    db.delete(invitation)
    db.commit()
    return {"message": "Invitation revoked successfully"}


@router.put("/team/{user_id}/role")
def update_member_role(
    user_id: int,
    role_in: TeamMemberRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a team member's role (admin, manager, rep)."""
    target_user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found in your organization.")

    # Guard: prevent demoting oneself if the only admin
    if target_user.id == current_user.id and role_in.role != "admin":
        admin_count = (
            db.query(User)
            .filter(
                User.organization_id == current_user.organization_id,
                User.role == "admin",
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote yourself: the organization must have at least one admin.",
            )

    target_user.role = role_in.role
    db.commit()
    return {"message": f"User role updated to {role_in.role}"}


@router.delete("/team/{user_id}")
def remove_team_member(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove a member from the organization."""
    if target_user_id := user_id:
        if target_user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot remove yourself from the organization.")

    target_user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found.")

    target_user.organization_id = None
    target_user.role = "rep"
    db.commit()
    return {"message": "Member removed from organization successfully"}


@router.get("/stats", response_model=TeamStatsResponse)
def get_organization_stats(
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Get aggregate call performance metrics and per-rep breakdowns."""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="No organization assigned.")

    return get_team_stats(db, current_user.organization_id)
