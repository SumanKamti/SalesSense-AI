"""Tests for health endpoint."""


def test_health_endpoint(client):
    """Test the health check returns 200."""
    res = client.get("/api/v1/health/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy" or "status" in data


def test_root_endpoint(client):
    """Test the root endpoint returns app info."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "Application" in data or "SalesSense" in str(data)
