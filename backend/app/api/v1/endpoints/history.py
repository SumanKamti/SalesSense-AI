from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.conversation import ConversationDetail, ConversationListItem

router = APIRouter()


def _format_conversation_item(conv: Conversation) -> dict:
    return {
        "id": conv.id,
        "title": conv.title,
        "audio_filename": conv.audio_filename,
        "duration_seconds": conv.duration_seconds,
        "sales_score": conv.sales_score,
        "sentiment": conv.sentiment,
        "created_at": conv.created_at,
        "user_id": conv.user_id,
        "user_full_name": conv.user.full_name if conv.user else "Unknown",
        "organization_id": conv.organization_id,
    }


@router.get("/")
def list_conversations(
    rep_id: Optional[int] = Query(None, description="Filter calls by specific sales rep ID (Admins/Managers only)"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List conversations.
    - Admins and Managers view all team calls in their organization.
    - Sales Reps view only their own calls.
    """
    query = db.query(Conversation)

    if current_user.organization_id and current_user.role in ("admin", "manager"):
        # Org wide visibility
        query = query.filter(
            (Conversation.organization_id == current_user.organization_id)
            | (Conversation.user_id == current_user.id)
        )
        if rep_id:
            query = query.filter(Conversation.user_id == rep_id)
    else:
        # Solo or rep visibility: only their own
        query = query.filter(Conversation.user_id == current_user.id)

    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    conversations = query.order_by(Conversation.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "items": [_format_conversation_item(c) for c in conversations],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve detailed transcript and analysis for a single call."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Check access permission
    can_view = False
    if conv.user_id == current_user.id:
        can_view = True
    elif (
        current_user.organization_id
        and conv.organization_id == current_user.organization_id
        and current_user.role in ("admin", "manager")
    ):
        can_view = True

    if not can_view:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this conversation.",
        )

    data = _format_conversation_item(conv)
    data["transcript_json"] = conv.transcript_json
    data["analysis_json"] = conv.analysis_json
    return data


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a call record (owner or organization admin)."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    can_delete = False
    if conv.user_id == current_user.id:
        can_delete = True
    elif (
        current_user.organization_id
        and conv.organization_id == current_user.organization_id
        and current_user.role == "admin"
    ):
        can_delete = True

    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this conversation.",
        )

    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully"}
