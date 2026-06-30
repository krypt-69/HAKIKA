import uuid
import pytest

@pytest.fixture
def client():
    import httpx
    return httpx.Client(base_url="http://localhost:8000")

def _setup_order(client):
    """Create owner, business, product, order, accept, assign rider, arrive, confirm. Return order_id."""
    email = f"pay-{uuid.uuid4()}@test.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": "test123", "role": "owner"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "test123"})
    token = login.json()["access_token"]
    # business
    bresp = client.post("/api/v1/businesses", json={
        "name": "Pay Store", "category_id": 1,
        "location": {"lat": -1.28, "lon": 36.82},
        "operating_hours": [{"day_of_week": 0, "opens_at": "08:00", "closes_at": "20:00", "is_closed": False}],
        "payment_method": {"type": "till", "account_number": "111"}
    }, headers={"Authorization": f"Bearer {token}"})
    bid = bresp.json()["id"]
    # product
    presp = client.post(f"/api/v1/businesses/{bid}/products", json={"name": "X", "original_price": 50}, headers={"Authorization": f"Bearer {token}"})
    pid = presp.json()["id"]
    # rider
    rider_email = f"rider-{uuid.uuid4()}@test.com"
    client.post(f"/api/v1/riders/{bid}", json={"name": "R", "email": rider_email, "phone": "0700000001"}, headers={"Authorization": f"Bearer {token}"})
    client.post("/api/v1/auth/register", json={"email": rider_email, "password": "rider123", "role": "rider"})
    rider_login = client.post("/api/v1/auth/login", json={"email": rider_email, "password": "rider123"})
    rider_token = rider_login.json()["access_token"]
    riders = client.get(f"/api/v1/riders/{bid}", headers={"Authorization": f"Bearer {token}"}).json()
    rider_id = riders[0]["id"]
    # order
    phone = "0730000000"
    oresp = client.post("/api/v1/orders", json={
        "phone": phone, "business_id": bid,
        "items": [{"product_id": pid, "quantity": 1}],
        "delivery_lat": -1.28, "delivery_lon": 36.82
    })
    oid = oresp.json()["id"]
    # accept
    client.put(f"/api/v1/orders/{oid}/accept", headers={"Authorization": f"Bearer {token}"})
    # assign
    client.put(f"/api/v1/delivery/orders/{oid}/assign?rider_id={rider_id}", headers={"Authorization": f"Bearer {token}"})
    # arrive
    client.put(f"/api/v1/delivery/orders/{oid}/arrive?gps_lat=-1.28&gps_lon=36.82", headers={"Authorization": f"Bearer {rider_token}"})
    # confirm
    client.post(f"/api/v1/orders/{oid}/confirm", json={"phone": phone})
    return oid

def test_payment_callback_completes_payment(client):
    oid = _setup_order(client)
    init_resp = client.post(f"/api/v1/payments/{oid}/initiate")
    assert init_resp.status_code == 200
    checkout_id = init_resp.json()["checkout_id"]
    cb_resp = client.post(f"/api/v1/payments/mock/callback/{checkout_id}")
    assert cb_resp.status_code == 200
    assert cb_resp.json()["status"] == "verified"
    client.close()

def test_duplicate_callback_idempotent(client):
    oid = _setup_order(client)
    init_resp = client.post(f"/api/v1/payments/{oid}/initiate")
    checkout_id = init_resp.json()["checkout_id"]
    r1 = client.post(f"/api/v1/payments/mock/callback/{checkout_id}")
    assert r1.json()["status"] == "verified"
    r2 = client.post(f"/api/v1/payments/mock/callback/{checkout_id}")
    assert r2.json()["status"] == "already_verified"
    client.close()
