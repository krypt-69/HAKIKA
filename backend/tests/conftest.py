import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def owner_token(client):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "testowner@test.com",
        "password": "test123",
        "role": "owner"
    })
    if resp.status_code not in (201, 400):  # 400 if already exists
        resp.raise_for_status()
    resp = await client.post("/api/v1/auth/login", json={
        "email": "testowner@test.com",
        "password": "test123"
    })
    return resp.json()["access_token"]

@pytest_asyncio.fixture
async def business_id(client, owner_token):
    resp = await client.post("/api/v1/businesses", json={
        "name": "Test Business",
        "category_id": 1,
        "location": {"lat": -1.28, "lon": 36.82, "address_text": "Test"},
        "operating_hours": [{"day_of_week": 0, "opens_at": "08:00:00", "closes_at": "20:00:00", "is_closed": False}],
        "payment_method": {"type": "till", "account_number": "123456"}
    }, headers={"Authorization": f"Bearer {owner_token}"})
    return resp.json()["id"]
