from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from datetime import datetime, timezone, timedelta
from typing import Optional
import json

from app.database.database import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.core.security import require_admin_or_manager

router = APIRouter()


@router.get("/dashboard")
def get_analytics_dashboard(
    days: int = Query(default=30, ge=7, le=365),
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Get comprehensive analytics dashboard data for the organization."""
    org_id = current_user.organization_id
    if not org_id:
        return {"error": "No organization found"}

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Base query: all org calls within the time range
    base_q = db.query(Conversation).filter(
        Conversation.organization_id == org_id,
        Conversation.created_at >= cutoff,
    )

    all_calls = base_q.all()

    # === 1. Overview Metrics ===
    total_calls = len(all_calls)
    scored_calls = [c for c in all_calls if c.sales_score is not None]
    avg_score = round(sum(c.sales_score for c in scored_calls) / len(scored_calls), 1) if scored_calls else 0
    total_duration_mins = round(sum(c.duration_seconds or 0 for c in all_calls) / 60, 1)
    strong_calls = len([c for c in scored_calls if c.sales_score >= 75])

    # === 2. Score Trends (weekly averages) ===
    score_trends = []
    if all_calls:
        # Group calls by week
        weeks = {}
        for c in scored_calls:
            # Get the Monday of that week
            week_start = c.created_at.date() - timedelta(days=c.created_at.weekday())
            week_key = week_start.isoformat()
            if week_key not in weeks:
                weeks[week_key] = []
            weeks[week_key].append(c.sales_score)

        for week_key in sorted(weeks.keys()):
            scores = weeks[week_key]
            score_trends.append({
                "week": week_key,
                "avg_score": round(sum(scores) / len(scores), 1),
                "call_count": len(scores),
            })

    # === 3. Rep Comparison ===
    rep_stats = []
    # Get all reps in the org
    org_users = db.query(User).filter(User.organization_id == org_id).all()
    for u in org_users:
        user_calls = [c for c in all_calls if c.user_id == u.id]
        user_scored = [c for c in user_calls if c.sales_score is not None]
        rep_stats.append({
            "id": u.id,
            "name": u.full_name,
            "role": u.role,
            "total_calls": len(user_calls),
            "avg_score": round(sum(c.sales_score for c in user_scored) / len(user_scored), 1) if user_scored else 0,
            "avg_duration": round(sum(c.duration_seconds or 0 for c in user_calls) / max(len(user_calls), 1) / 60, 1),
            "strong_calls": len([c for c in user_scored if c.sales_score >= 75]),
        })
    rep_stats.sort(key=lambda x: x["avg_score"], reverse=True)

    # === 4. Call Volume (daily counts for chart) ===
    call_volume = []
    if all_calls:
        day_counts = {}
        for c in all_calls:
            day_key = c.created_at.date().isoformat()
            day_counts[day_key] = day_counts.get(day_key, 0) + 1

        # Fill in missing days with 0
        current = cutoff.date()
        today = datetime.now(timezone.utc).date()
        while current <= today:
            day_key = current.isoformat()
            call_volume.append({
                "date": day_key,
                "count": day_counts.get(day_key, 0),
            })
            current += timedelta(days=1)

    # === 5. Sentiment Distribution ===
    sentiment_dist = {"Positive": 0, "Neutral": 0, "Negative": 0, "Unknown": 0}
    for c in all_calls:
        if c.sentiment:
            s = c.sentiment.lower()
            if "positive" in s:
                sentiment_dist["Positive"] += 1
            elif "negative" in s:
                sentiment_dist["Negative"] += 1
            elif "neutral" in s:
                sentiment_dist["Neutral"] += 1
            else:
                sentiment_dist["Unknown"] += 1
        else:
            sentiment_dist["Unknown"] += 1

    sentiment_data = [
        {"name": k, "value": v}
        for k, v in sentiment_dist.items() if v > 0
    ]

    # === 6. Top Coaching Areas ===
    coaching_areas = {}
    for c in all_calls:
        if c.analysis_json:
            try:
                analysis = json.loads(c.analysis_json) if isinstance(c.analysis_json, str) else c.analysis_json
                # Look for improvement areas in the analysis
                improvements = analysis.get("areas_for_improvement", analysis.get("improvements", []))
                if isinstance(improvements, list):
                    for item in improvements:
                        area = item if isinstance(item, str) else item.get("area", item.get("title", str(item)))
                        if area:
                            area_clean = area.strip()[:80]  # Truncate long names
                            coaching_areas[area_clean] = coaching_areas.get(area_clean, 0) + 1
            except (json.JSONDecodeError, AttributeError, TypeError):
                pass

    top_coaching = sorted(
        [{"area": k, "count": v} for k, v in coaching_areas.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    return {
        "overview": {
            "total_calls": total_calls,
            "avg_score": avg_score,
            "total_duration_mins": total_duration_mins,
            "strong_calls": strong_calls,
            "strong_call_pct": round(strong_calls / max(total_calls, 1) * 100, 1),
        },
        "score_trends": score_trends,
        "rep_comparison": rep_stats,
        "call_volume": call_volume,
        "sentiment_distribution": sentiment_data,
        "top_coaching_areas": top_coaching,
        "period_days": days,
    }
