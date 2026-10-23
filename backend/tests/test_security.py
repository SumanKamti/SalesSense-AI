"""Tests for security features."""
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    """Test password hash and verify."""
    password = "TestPassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_jwt_create_and_decode():
    """Test JWT creation and decoding."""
    token = create_access_token(data={"sub": "42"})
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert "jti" in payload
    assert "exp" in payload


def test_jwt_invalid_token():
    """Test that an invalid JWT raises an error."""
    import pytest
    with pytest.raises(Exception):
        decode_access_token("invalid.token.here")


def test_rate_limiting(client):
    """Test that rate limiting is configured (basic check)."""
    # The rate limiter should be attached to the app
    assert hasattr(client.app.state, 'limiter')
