import uuid
import pytest

def test_owner_registration(client):
    email = f"testowner-{uuid.uuid4()}@example.com"
    resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "securepass123",
        "role": "owner"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == email
    assert data["role"] == "owner"

def test_duplicate_registration(client):
    email = f"duptest-{uuid.uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "pass123",
        "role": "owner"
    })
    resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "pass456",
        "role": "owner"
    })
    assert resp.status_code == 400

def test_login_success(client):
    email = f"logintest-{uuid.uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "loginpass123",
        "role": "owner"
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "loginpass123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login_wrong_password(client):
    email = f"wrongpass-{uuid.uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "rightpass",
        "role": "owner"
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "wrongpass"
    })
    assert resp.status_code == 401

def test_refresh_rotation(client):
    email = f"refresh-{uuid.uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "refreshpass",
        "role": "owner"
    })
    login_resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "refreshpass"
    })
    tokens = login_resp.json()
    old_refresh = tokens["refresh_token"]

    # refresh – should get a new refresh token
    refresh_resp = client.post("/api/v1/auth/refresh", json={
        "refresh_token": old_refresh
    })
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    # refresh token must be different (rotation)
    assert new_tokens["refresh_token"] != old_refresh

    # old refresh token must now be rejected
    resp = client.post("/api/v1/auth/refresh", json={
        "refresh_token": old_refresh
    })
    assert resp.status_code == 401

def test_customer_session(client):
    phone = "0711000000"
    resp = client.post("/api/v1/auth/customer/session", json={
        "phone": phone
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "session_token" in data
    assert "customer_id" in data
