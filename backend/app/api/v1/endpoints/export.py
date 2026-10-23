import csv
import io
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.core.security import get_current_user
from app.core.audit_middleware import log_audit_event

router = APIRouter()


@router.get("/call/{call_id}/csv")
def export_call_csv(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export a single call transcript as CSV."""
    call = db.query(Conversation).filter(Conversation.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # Check access: user owns the call or is in same org as admin/manager
    if call.user_id != current_user.id:
        if not (current_user.organization_id and call.organization_id == current_user.organization_id
                and current_user.role in ("admin", "manager")):
            raise HTTPException(status_code=403, detail="Access denied")

    output = io.StringIO()
    writer = csv.writer(output)

    # Header info
    writer.writerow(["Call Report", call.title or "Untitled"])
    writer.writerow(["File", call.audio_filename or ""])
    writer.writerow(["Date", str(call.created_at)])
    writer.writerow(["Duration (seconds)", call.duration_seconds or ""])
    writer.writerow(["Quality Score", call.sales_score or ""])
    writer.writerow(["Sentiment", call.sentiment or ""])
    writer.writerow([])

    # Transcript
    writer.writerow(["Speaker", "Start", "End", "Text"])
    if call.transcript_json:
        try:
            transcript = json.loads(call.transcript_json) if isinstance(call.transcript_json, str) else call.transcript_json
            if isinstance(transcript, list):
                for segment in transcript:
                    writer.writerow([
                        segment.get("speaker", ""),
                        segment.get("start", ""),
                        segment.get("end", ""),
                        segment.get("text", ""),
                    ])
        except (json.JSONDecodeError, TypeError):
            writer.writerow(["Error parsing transcript"])

    # Analysis summary
    writer.writerow([])
    writer.writerow(["=== AI Analysis ==="])
    if call.analysis_json:
        try:
            analysis = json.loads(call.analysis_json) if isinstance(call.analysis_json, str) else call.analysis_json
            for key, value in analysis.items():
                if isinstance(value, (str, int, float)):
                    writer.writerow([key, value])
                elif isinstance(value, list):
                    writer.writerow([key, "; ".join(str(v) for v in value)])
        except (json.JSONDecodeError, TypeError):
            writer.writerow(["Error parsing analysis"])

    output.seek(0)
    filename = f"salessense_call_{call_id}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"

    log_audit_event(
        user_id=current_user.id,
        action="call_export_csv",
        resource_type="call",
        resource_id=str(call_id),
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/call/{call_id}/pdf")
def export_call_pdf(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export a single call transcript + analysis as PDF."""
    call = db.query(Conversation).filter(Conversation.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    if call.user_id != current_user.id:
        if not (current_user.organization_id and call.organization_id == current_user.organization_id
                and current_user.role in ("admin", "manager")):
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF generation library (reportlab) is not installed.",
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=18, spaceAfter=12)
    story.append(Paragraph(f"SalesSense AI — Call Report", title_style))
    story.append(Spacer(1, 6))

    # Metadata table
    meta_data = [
        ["Call Title", call.title or "Untitled"],
        ["Audio File", call.audio_filename or "—"],
        ["Date", str(call.created_at.strftime('%b %d, %Y %H:%M')) if call.created_at else "—"],
        ["Duration", f"{int((call.duration_seconds or 0) // 60)}:{int((call.duration_seconds or 0) % 60):02d}"],
        ["Quality Score", f"{call.sales_score}/100" if call.sales_score is not None else "—"],
        ["Sentiment", call.sentiment or "—"],
    ]
    meta_table = Table(meta_data, colWidths=[1.5*inch, 4.5*inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.93, 0.93, 0.97)),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.85, 0.85, 0.85)),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # Transcript
    story.append(Paragraph("Transcript", styles['Heading2']))
    story.append(Spacer(1, 6))
    if call.transcript_json:
        try:
            transcript = json.loads(call.transcript_json) if isinstance(call.transcript_json, str) else call.transcript_json
            if isinstance(transcript, list):
                for seg in transcript:
                    speaker = seg.get('speaker', 'Unknown')
                    text = seg.get('text', '')
                    story.append(Paragraph(f"<b>{speaker}:</b> {text}", styles['Normal']))
                    story.append(Spacer(1, 3))
        except (json.JSONDecodeError, TypeError):
            story.append(Paragraph("Error parsing transcript.", styles['Normal']))
    else:
        story.append(Paragraph("No transcript available.", styles['Normal']))

    story.append(Spacer(1, 16))

    # Analysis
    story.append(Paragraph("AI Analysis", styles['Heading2']))
    story.append(Spacer(1, 6))
    if call.analysis_json:
        try:
            analysis = json.loads(call.analysis_json) if isinstance(call.analysis_json, str) else call.analysis_json
            for key, value in analysis.items():
                display_key = key.replace('_', ' ').title()
                if isinstance(value, (str, int, float)):
                    story.append(Paragraph(f"<b>{display_key}:</b> {value}", styles['Normal']))
                elif isinstance(value, list):
                    story.append(Paragraph(f"<b>{display_key}:</b>", styles['Normal']))
                    for item in value:
                        if isinstance(item, dict):
                            item_text = item.get('area', item.get('title', item.get('point', str(item))))
                        else:
                            item_text = str(item)
                        story.append(Paragraph(f"  • {item_text}", styles['Normal']))
                elif isinstance(value, dict):
                    story.append(Paragraph(f"<b>{display_key}:</b>", styles['Normal']))
                    for k, v in value.items():
                        story.append(Paragraph(f"  • {k.replace('_', ' ').title()}: {v}", styles['Normal']))
                story.append(Spacer(1, 4))
        except (json.JSONDecodeError, TypeError):
            story.append(Paragraph("Error parsing analysis.", styles['Normal']))
    else:
        story.append(Paragraph("No analysis available.", styles['Normal']))

    # Footer
    story.append(Spacer(1, 20))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=colors.gray)
    story.append(Paragraph(
        f"Generated by SalesSense AI on {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}",
        footer_style,
    ))

    doc.build(story)
    buffer.seek(0)
    filename = f"salessense_call_{call_id}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

    log_audit_event(
        user_id=current_user.id,
        action="call_export_pdf",
        resource_type="call",
        resource_id=str(call_id),
    )

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/history/csv")
def export_history_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all call history as CSV."""
    query = db.query(Conversation).filter(Conversation.user_id == current_user.id)

    # If admin/manager, export all org calls
    if current_user.organization_id and current_user.role in ("admin", "manager"):
        query = db.query(Conversation).filter(
            Conversation.organization_id == current_user.organization_id
        )

    calls = query.order_by(Conversation.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Audio File", "Date", "Duration (s)", "Quality Score", "Sentiment"])

    for call in calls:
        writer.writerow([
            call.id,
            call.title or "",
            call.audio_filename or "",
            str(call.created_at),
            call.duration_seconds or "",
            call.sales_score or "",
            call.sentiment or "",
        ])

    output.seek(0)
    filename = f"salessense_history_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"

    log_audit_event(
        user_id=current_user.id,
        action="history_export_csv",
        resource_type="history",
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/my-data")
def export_my_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GDPR: Download all personal data as JSON."""
    calls = db.query(Conversation).filter(Conversation.user_id == current_user.id).all()

    user_data = {
        "personal_info": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "organization_id": current_user.organization_id,
            "created_at": str(current_user.created_at) if hasattr(current_user, 'created_at') else None,
        },
        "calls": [
            {
                "id": c.id,
                "title": c.title,
                "audio_filename": c.audio_filename,
                "duration_seconds": c.duration_seconds,
                "sales_score": c.sales_score,
                "sentiment": c.sentiment,
                "created_at": str(c.created_at),
                "transcript": json.loads(c.transcript_json) if c.transcript_json else None,
                "analysis": json.loads(c.analysis_json) if c.analysis_json else None,
            }
            for c in calls
        ],
        "export_date": datetime.now(timezone.utc).isoformat(),
    }

    log_audit_event(
        user_id=current_user.id,
        action="gdpr_data_export",
        resource_type="user_data",
    )

    output = io.BytesIO(json.dumps(user_data, indent=2, default=str).encode('utf-8'))
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="salessense_my_data_{current_user.id}.json"'},
    )


@router.delete("/my-data")
def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GDPR: Delete all personal data and account."""
    user_id = current_user.id

    # Delete all user's conversations
    db.query(Conversation).filter(Conversation.user_id == user_id).delete()

    # Log before deleting user
    log_audit_event(
        user_id=user_id,
        action="gdpr_data_delete",
        resource_type="user_data",
        details=f"User {current_user.email} requested full data deletion",
    )

    # Delete user account
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    return {"message": "All personal data has been deleted. Your account no longer exists."}


@router.get("/audit-log")
def get_audit_log(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get audit log entries. Admins see org-wide logs, users see their own."""
    from app.models.audit_log import AuditLog

    if current_user.role == "admin" and current_user.organization_id:
        # Admin sees all org users' audit logs
        org_user_ids = [
            u.id for u in db.query(User).filter(
                User.organization_id == current_user.organization_id
            ).all()
        ]
        logs = db.query(AuditLog).filter(
            AuditLog.user_id.in_(org_user_ids)
        ).order_by(AuditLog.created_at.desc()).limit(200).all()
    else:
        logs = db.query(AuditLog).filter(
            AuditLog.user_id == current_user.id
        ).order_by(AuditLog.created_at.desc()).limit(100).all()

    # Get user names for display
    user_ids = list(set(log.user_id for log in logs if log.user_id))
    users = {u.id: u.full_name for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    return [
        {
            "id": log.id,
            "user_name": users.get(log.user_id, "Unknown"),
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
