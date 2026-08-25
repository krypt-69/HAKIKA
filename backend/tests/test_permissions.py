import uuid
import pytest

@pytest.fixture
def client():
    import httpx
    return httpx.Client(base_url="http://localhost:8000")

def test_business_isolation(client):
    e1 = f"o1-{uuid.uuid4()}@t.com"
    e2 = f"o2-{uuid.uuid4()}@t.com"
    client.post("/api/v1/auth/register", json={"email": e1, "password": "p1", "role": "owner"})
    client.post("/api/v1/auth/register", json={"email": e2, "password": "p2", "role": "owner"})
    t1 = client.post("/api/v1/auth/login", json={"email": e1, "password": "p1"}).json()["access_token"]
    t2 = client.post("/api/v1/auth/login", json={"email": e2, "password": "p2"}).json()["access_token"]
    b1 = client.post("/api/v1/businesses", json={"name":"B1","category_id":1,"location":{"lat":-1.28,"lon":36.82},"operating_hours":[],"payment_method":{"type":"till","account_number":"111"}}, headers={"Authorization": f"Bearer {t1}"}).json()["id"]
    b2 = client.post("/api/v1/businesses", json={"name":"B2","category_id":1,"location":{"lat":-1.29,"lon":36.83},"operating_hours":[],"payment_method":{"type":"till","account_number":"222"}}, headers={"Authorization": f"Bearer {t2}"}).json()["id"]
    # owner1 tries to create product in business2
    resp = client.post(f"/api/v1/businesses/{b2}/products", json={"name":"Hack","original_price":10}, headers={"Authorization": f"Bearer {t1}"})
    assert resp.status_code == 403
    client.close()
