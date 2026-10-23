import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

# Actions that should be audit-logged
AUDITED_PATHS = {
    ("POST", "/api/v1/auth/login"): "login",
    ("POST", "/api/v1/auth/logout"): "logout",
    ("POST", "/api/v1/auth/register"): "register",
    ("DELETE", "/api/v1/export/my-data"): "gdpr_delete",
    ("GET", "/api/v1/export/my-data"): "gdpr_export",
}

# Patterns for dynamic paths
AUDITED_PATTERNS = [
    ("GET", "/api/v1/export/call/", "call_export"),
    ("DELETE", "/api/v1/history/", "call_delete"),
    ("PUT", "/api/v1/organization/team/", "role_change"),
    ("DELETE", "/api/v1/organization/team/", "member_remove"),
]


def log_audit_event(
    user_id: int = None,
    action: str = "",
    resource_type: str = None,
    resource_id: str = None,
    details: str = None,
    ip_address: str = None,
):
    """Log an audit event to the database."""
    db: Session = SessionLocal()
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
        db.rollback()
    finally:
        db.close()


async def audit_log_middleware(request, call_next):
    """Middleware that logs sensitive actions to the audit log."""
    response = await call_next(request)

    # Only log successful operations (2xx status codes)
    if response.status_code < 200 or response.status_code >= 300:
        return response

    method = request.method
    path = request.url.path
    ip = request.client.host if request.client else "unknown"

    # Extract user_id from request state if available
    user_id = getattr(request.state, "user_id", None)

    # Check exact path matches
    action = AUDITED_PATHS.get((method, path))

    # Check pattern matches
    if not action:
        for m, pattern, act in AUDITED_PATTERNS:
            if method == m and path.startswith(pattern):
                action = act
                break

    if action:
        # Extract resource info from path
        resource_id = None
        resource_type = None

        if "call" in path or "history" in path:
            resource_type = "call"
            parts = path.rstrip("/").split("/")
            if parts and parts[-1].isdigit():
                resource_id = parts[-1]
            elif len(parts) > 1 and parts[-2].isdigit():
                resource_id = parts[-2]
        elif "team" in path or "organization" in path:
            resource_type = "user"
            parts = path.rstrip("/").split("/")
            for i, p in enumerate(parts):
                if p.isdigit():
                    resource_id = p
                    break
        elif "auth" in path:
            resource_type = "auth"
        elif "export" in path and "my-data" in path:
            resource_type = "user_data"

        log_audit_event(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=f"{method} {path}",
            ip_address=ip,
        )

    return response
