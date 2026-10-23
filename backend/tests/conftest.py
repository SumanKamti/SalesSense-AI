import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database.base import Base
from app.database.database import get_db
from app.main import app

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test_salessense.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create all tables before each test, drop after."""
    # Import all models so they're registered with Base
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Direct DB session for test setup."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def registered_user(client):
    """Register a test user and return their data."""
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "testuser@example.com",
        "password": "SecurePass123",
    })
    assert res.status_code == 200
    return res.json()


@pytest.fixture
def auth_headers(client, registered_user):
    """Login and return auth headers."""
    res = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "SecurePass123",
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
