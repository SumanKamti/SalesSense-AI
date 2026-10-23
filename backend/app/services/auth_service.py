from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password
from app.services.organization_service import create_organization, validate_invite


def create_user(db: Session, user: UserCreate) -> Optional[User]:
    """
    Create a new user account with optional team creation or invite redemption.
    Returns:
        User object if successful, None if email already exists.
    """
    existing_user = (
        db.query(User)
        .filter(User.email == user.email.lower().strip())
        .first()
    )

    if existing_user:
        return None

    # Determine initial role and org
    initial_role = "rep"
    org_id = None

    # Check if redeeming an invitation
    invitation = None
    if user.invite_code and user.invite_code.strip():
        invitation = validate_invite(db, user.invite_code.strip(), user.email)
        if invitation:
            initial_role = invitation.role
            org_id = invitation.organization_id

    # If creating a new organization
    if user.organization_name and user.organization_name.strip() and not org_id:
        initial_role = "admin"

    db_user = User(
        full_name=user.full_name.strip(),
        email=user.email.lower().strip(),
        hashed_password=hash_password(user.password),
        role=initial_role,
        organization_id=org_id,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # If invitation was used, track usage and capacity
    if invitation:
        invitation.used_count = (invitation.used_count or 0) + 1
        invitation.used_by_id = db_user.id
        if invitation.max_uses is not None and invitation.used_count >= invitation.max_uses:
            invitation.used = True
        db.add(invitation)
        db.commit()

    # If user specified organization_name and had no invite, create the org now
    if user.organization_name and user.organization_name.strip() and not org_id:
        create_organization(db, name=user.organization_name.strip(), user=db_user)

    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        # Run dummy hash verify to prevent timing attacks
        verify_password("dummy_password", "$2b$12$e88yL2X97jX41hZfV0rYquu7KiqhC.0K8k8bH1X0Q7w1R0f3hLqW6")
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user