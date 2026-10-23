import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.organization import Organization
from app.models.invitation import Invitation
from app.models.user import User
from app.models.conversation import Conversation


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from name with random hex suffix for uniqueness."""
    base_slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    if not base_slug:
        base_slug = "org"
    return f"{base_slug[:50]}-{secrets.token_hex(4)}"


def create_organization(db: Session, name: str, user: Optional[User] = None) -> Organization:
    """Create a new organization and assign user as the initial admin."""
    slug = generate_slug(name)
    org = Organization(
        name=name.strip(),
        slug=slug,
        created_by_id=user.id if user else None,
    )
    db.add(org)
    db.flush()

    if user:
        user.organization_id = org.id
        user.role = "admin"
        db.add(user)

    db.commit()
    db.refresh(org)
    return org


POSITIVE_WORDS = [
    "GROWTH", "SCALE", "SALES", "HERO", "APEX", "EAGLE", "BOOST",
    "LEAD", "SUMMIT", "TALENT", "CHAMP", "FOCUS", "ELITE", "PRIME",
    "TITAN", "ALPHA", "VENTURE", "FORWARD", "FORCE", "SPARK", "NEXUS",
    "DYNAMIC", "PRO", "VICTORY", "IMPACT", "PULSE", "STAR"
]


def generate_meaningful_invite_code(org_name: str, db: Session) -> str:
    """
    Generate a meaningful, branded, human-readable invite code.
    Format: <ORG_PREFIX>-<WORD>-<4_DIGITS>
    Example: CYBERDYNE-GROWTH-8392 or ACME-TITAN-4102
    """
    # Clean org name: keep alphanumeric uppercase, up to 12 chars
    clean_prefix = re.sub(r"[^A-Za-z0-9]", "", org_name).upper()[:12]
    if not clean_prefix:
        clean_prefix = "TEAM"

    for _ in range(25):
        word = secrets.choice(POSITIVE_WORDS)
        number = secrets.randbelow(9000) + 1000  # 1000 to 9999
        candidate = f"{clean_prefix}-{word}-{number}"
        exists = (
            db.query(Invitation)
            .filter(func.upper(Invitation.invite_code) == candidate)
            .first()
        )
        if not exists:
            return candidate

    # Fallback with random hex suffix
    return f"{clean_prefix}-{secrets.choice(POSITIVE_WORDS)}-{secrets.token_hex(2).upper()}"


def generate_invite(
    db: Session,
    org_id: int,
    role: str = "rep",
    email: Optional[str] = None,
    max_uses: Optional[int] = None,
    custom_code: Optional[str] = None,
    days_valid: int = 30,
) -> Invitation:
    """
    Generate a branded invitation code for an organization.
    Supports single-use, multi-use (e.g. 50 reps), or unlimited team links.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    org_name = org.name if org else "TEAM"

    if custom_code and custom_code.strip():
        # Sanitize custom code: uppercase, hyphen-separated
        clean_code = re.sub(r"[^A-Za-z0-9_-]", "", custom_code.strip()).upper()
        # Check uniqueness
        exists = db.query(Invitation).filter(func.upper(Invitation.invite_code) == clean_code).first()
        if exists:
            clean_code = f"{clean_code}-{secrets.randbelow(9000) + 1000}"
        invite_code = clean_code
    else:
        invite_code = generate_meaningful_invite_code(org_name, db)

    expires_at = datetime.now(timezone.utc) + timedelta(days=days_valid) if days_valid else None

    invitation = Invitation(
        organization_id=org_id,
        invite_code=invite_code,
        email=email.strip().lower() if email else None,
        role=role,
        max_uses=max_uses,
        used_count=0,
        is_active=True,
        used=False,
        expires_at=expires_at,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


def validate_invite(db: Session, invite_code: str, email: Optional[str] = None) -> Optional[Invitation]:
    """Check if invite is valid, active, unexpired, and has remaining capacity."""
    code_cleaned = invite_code.strip().upper()
    invitation = (
        db.query(Invitation)
        .filter(func.upper(Invitation.invite_code) == code_cleaned)
        .first()
    )
    if not invitation:
        return None

    # Must be active
    if not getattr(invitation, "is_active", True):
        return None

    # Must not be marked exhausted
    if invitation.used:
        return None

    # Check capacity limit
    if invitation.max_uses is not None and invitation.used_count >= invitation.max_uses:
        return None

    # Check expiration
    if invitation.expires_at:
        exp = invitation.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            return None

    # Check optional email lock
    if invitation.email and email and invitation.email.lower() != email.strip().lower():
        return None

    return invitation


def redeem_invite(db: Session, invite_code: str, user: User) -> bool:
    """Assign user to organization and increment invite used_count."""
    invitation = validate_invite(db, invite_code, user.email)
    if not invitation:
        return False

    user.organization_id = invitation.organization_id
    user.role = invitation.role

    # Track usage
    invitation.used_count = (invitation.used_count or 0) + 1
    invitation.used_by_id = user.id

    # If capacity limit reached, mark exhausted
    if invitation.max_uses is not None and invitation.used_count >= invitation.max_uses:
        invitation.used = True

    db.add(user)
    db.add(invitation)
    db.commit()
    return True


def get_team_members(db: Session, org_id: int) -> List[dict]:
    """Retrieve all members of an organization with call count and average score."""
    members = (
        db.query(User)
        .filter(User.organization_id == org_id)
        .order_by(User.created_at.asc())
        .all()
    )

    results = []
    for member in members:
        # Calculate stats
        convs = (
            db.query(Conversation)
            .filter(Conversation.user_id == member.id)
            .all()
        )
        call_count = len(convs)
        scores = [c.sales_score for c in convs if c.sales_score is not None]
        avg_score = round(sum(scores) / len(scores)) if scores else None

        results.append({
            "id": member.id,
            "full_name": member.full_name,
            "email": member.email,
            "role": member.role,
            "created_at": member.created_at,
            "call_count": call_count,
            "avg_score": avg_score,
        })

    return results


def get_team_stats(db: Session, org_id: int) -> dict:
    """Aggregate high-level KPIs and per-rep breakdowns for the entire organization."""
    members = db.query(User).filter(User.organization_id == org_id).all()
    member_ids = [m.id for m in members]

    if not member_ids:
        return {
            "total_calls": 0,
            "avg_score": 0,
            "total_members": 0,
            "reps": [],
        }

    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id.in_(member_ids))
        .all()
    )

    valid_scores = [c.sales_score for c in conversations if c.sales_score is not None]
    overall_avg = round(sum(valid_scores) / len(valid_scores)) if valid_scores else 0

    # Per-rep stats
    reps_data = []
    for m in members:
        m_convs = [c for c in conversations if c.user_id == m.id]
        m_scores = [c.sales_score for c in m_convs if c.sales_score is not None]
        m_avg = round(sum(m_scores) / len(m_scores)) if m_scores else None
        last_call = max([c.created_at for c in m_convs]) if m_convs else None

        reps_data.append({
            "user_id": m.id,
            "full_name": m.full_name,
            "role": m.role,
            "call_count": len(m_convs),
            "avg_score": m_avg,
            "last_call_at": last_call,
        })

    # Sort reps by call count descending
    reps_data.sort(key=lambda r: r["call_count"], reverse=True)

    return {
        "total_calls": len(conversations),
        "avg_score": overall_avg,
        "total_members": len(members),
        "reps": reps_data,
    }
