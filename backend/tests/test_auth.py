"""Tests for authentication endpoints."""


def test_register_user(client):
    """Test successful user registration."""
    res = client.post("/api/v1/auth/register", json={
        "full_name": "John Doe",
        "email": "john@example.com",
        "password": "SecurePass123",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "john@example.com"
    assert data["full_name"] == "John Doe"
    assert data["role"] == "rep"
    assert "id" in data


def test_register_duplicate_email(client):
    """Test that registering with an existing email fails."""
    client.post("/api/v1/auth/register", json={
        "full_name": "User One",
        "email": "dupe@example.com",
        "password": "SecurePass123",
    })
    res = client.post("/api/v1/auth/register", json={
        "full_name": "User Two",
        "email": "dupe@example.com",
        "password": "AnotherPass456",
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


def test_register_short_password(client):
    """Test that a password shorter than 8 chars is rejected."""
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Short Pass",
        "email": "short@example.com",
        "password": "abc",
    })
    assert res.status_code == 422  # Validation error


def test_login_success(client, registered_user):
    """Test successful login returns a JWT token."""
    res = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "SecurePass123",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, registered_user):
    """Test login with wrong password fails."""
    res = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "WrongPassword",
    })
    assert res.status_code == 401


def test_login_nonexistent_user(client):
    """Test login with non-existent email fails."""
    res = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "SomePassword1",
    })
    assert res.status_code == 401


def test_get_me(client, auth_headers):
    """Test GET /me returns the current user's profile."""
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "testuser@example.com"
    assert data["full_name"] == "Test User"


def test_get_me_unauthorized(client):
    """Test GET /me without token returns 401."""
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_logout(client, auth_headers):
    """Test logout revokes the token."""
    res = client.post("/api/v1/auth/logout", headers=auth_headers)
    assert res.status_code == 200
    
    # After logout, the same token should be invalid
    res2 = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res2.status_code == 401


def test_register_with_organization(client):
    """Test registering with an organization name creates an org."""
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Admin User",
        "email": "admin@orgtest.com",
        "password": "SecurePass123",
        "organization_name": "Test Corp",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "admin"
    assert data["organization_id"] is not None
    assert data["organization_name"] == "Test Corp"


def test_forgot_password_flow(client, registered_user):
    """Test forgot password request and resetting with token."""
    # Request reset
    res = client.post("/api/v1/auth/forgot-password", json={
        "email": "testuser@example.com",
    })
    assert res.status_code == 200
    token = res.json().get("reset_token")
    assert token is not None

    # Reset with valid token and new password
    res_reset = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "BrandNewPassword123",
    })
    assert res_reset.status_code == 200

    # Old password should now fail
    res_old = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "SecurePass123",
    })
    assert res_old.status_code == 401

    # New password should succeed
    res_new = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "BrandNewPassword123",
    })
    assert res_new.status_code == 200
    assert "access_token" in res_new.json()


def test_forgot_password_nonexistent_email(client):
    """Test forgot password with non-existent email still returns success to prevent enumeration."""
    res = client.post("/api/v1/auth/forgot-password", json={
        "email": "nonexistent@example.com",
    })
    assert res.status_code == 200
    assert "reset_token" not in res.json()


def test_reset_password_invalid_token(client):
    """Test resetting with an invalid token fails."""
    res = client.post("/api/v1/auth/reset-password", json={
        "token": "invalid-token-xyz",
        "new_password": "NewSecurePassword123",
    })
    assert res.status_code == 400

