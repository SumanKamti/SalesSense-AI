"""Tests for call history endpoints."""
import json
from app.models.conversation import Conversation


def test_list_history_empty(client, auth_headers):
    """Test listing history when no calls exist."""
    res = client.get("/api/v1/history/", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    # Support both paginated and flat response
    items = data.get("items", data) if isinstance(data, dict) else data
    assert isinstance(items, list)
    assert len(items) == 0


def test_list_history_with_calls(client, auth_headers, db_session, registered_user):
    """Test listing history with calls."""
    # Create a test conversation
    conv = Conversation(
        user_id=registered_user["id"],
        title="Test Sales Call",
        audio_filename="test.mp3",
        duration_seconds=120.5,
        sales_score=82,
        sentiment="Positive",
        transcript_json=json.dumps([{"speaker": "Agent", "text": "Hello"}]),
    )
    db_session.add(conv)
    db_session.commit()

    res = client.get("/api/v1/history/", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    assert len(items) >= 1
    assert items[0]["title"] == "Test Sales Call"
    assert items[0]["sales_score"] == 82


def test_get_conversation_detail(client, auth_headers, db_session, registered_user):
    """Test getting a single conversation detail."""
    conv = Conversation(
        user_id=registered_user["id"],
        title="Detail Test",
        audio_filename="detail.mp3",
        transcript_json=json.dumps([{"speaker": "A", "text": "Hi"}]),
        analysis_json=json.dumps({"summary": "Good call"}),
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    res = client.get(f"/api/v1/history/{conv.id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Detail Test"
    assert data["transcript_json"] is not None
    assert data["analysis_json"] is not None


def test_get_conversation_not_found(client, auth_headers):
    """Test getting a non-existent conversation."""
    res = client.get("/api/v1/history/99999", headers=auth_headers)
    assert res.status_code == 404


def test_delete_conversation(client, auth_headers, db_session, registered_user):
    """Test deleting a conversation."""
    conv = Conversation(
        user_id=registered_user["id"],
        title="To Delete",
        audio_filename="delete.mp3",
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    res = client.delete(f"/api/v1/history/{conv.id}", headers=auth_headers)
    assert res.status_code == 200

    # Verify it's gone
    res2 = client.get(f"/api/v1/history/{conv.id}", headers=auth_headers)
    assert res2.status_code == 404


def test_history_unauthorized(client):
    """Test that history requires authentication."""
    res = client.get("/api/v1/history/")
    assert res.status_code == 401


def test_history_pagination(client, auth_headers, db_session, registered_user):
    """Test pagination metadata and limiting."""
    for i in range(5):
        conv = Conversation(
            user_id=registered_user["id"],
            title=f"Call {i}",
            audio_filename=f"test_{i}.mp3",
        )
        db_session.add(conv)
    db_session.commit()

    res = client.get("/api/v1/history/?page=1&page_size=2", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 5
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total_pages"] == 3
    assert len(data["items"]) == 2

