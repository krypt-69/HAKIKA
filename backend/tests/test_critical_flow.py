import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_complete_order_lifecycle(client: AsyncClient):
    # 1. Register business owner
    owner_email = f"owner-{uuid.uuid4()}@test.com"
    resp = await client.post("/api/v1/auth/register", json={
        "email": owner_email,
        "password": "test123",
        "role": "owner"
    })
    assert resp.status_code == 201

    # 2. Login owner
    resp = await client.post("/api/v1/auth/login", json={"email": owner_email, "password": "test123"})
    owner_token = resp.json()["access_token"]

    # 3. Create business
    resp = await client.post("/api/v1/businesses", json={
        "name": "Flow Test Store",
        "category_id": 1,
        "location": {"lat": -1.28, "lon": 36.82, "address_text": "Test"},
        "operating_hours": [{"day_of_week": 0, "opens_at": "08:00:00", "closes_at": "20:00:00", "is_closed": False}],
        "payment_method": {"type": "till", "account_number": "123456"}
    }, headers={"Authorization": f"Bearer {owner_token}"})
    assert resp.status_code == 201
    business_id = resp.json()["id"]

    # 4. Create product
    resp = await client.post(f"/api/v1/businesses/{business_id}/products", json={
        "name": "Test Product",
        "original_price": 100,
    }, headers={"Authorization": f"Bearer {owner_token}"})
    assert resp.status_code == 201
    product_id = resp.json()["id"]

    # 5. Create rider
    rider_email = f"rider-{uuid.uuid4()}@test.com"
    resp = await client.post(f"/api/v1/riders/{business_id}", json={
        "name": "Rider X", "email": rider_email, "phone": "0700000001"
    }, headers={"Authorization": f"Bearer {owner_token}"})
    assert resp.status_code == 201
    rider_id = resp.json()["id"]

    # 6. Register rider
    resp = await client.post("/api/v1/auth/register", json={
        "email": rider_email, "password": "test123", "role": "rider"
    })
    assert resp.status_code == 201

    # 7. Login rider
    resp = await client.post("/api/v1/auth/login", json={"email": rider_email, "password": "test123"})
    rider_token = resp.json()["access_token"]

    # 8. Create order
    phone = "0711111111"
    resp = await client.post("/api/v1/orders", json={
        "phone": phone,
        "business_id": business_id,
        "items": [{"product_id": product_id, "quantity": 1}],
        "delivery_lat": -1.28, "delivery_lon": 36.82
    })
    assert resp.status_code == 201
    order_id = resp.json()["id"]
    assert resp.json()["status"] == "waiting_acceptance"

    # 9. Accept order
    resp = await client.put(f"/api/v1/orders/{order_id}/accept", headers={"Authorization": f"Bearer {owner_token}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"

    # 10. Assign rider
    resp = await client.put(f"/api/v1/delivery/orders/{order_id}/assign?rider_id={rider_id}", headers={"Authorization": f"Bearer {owner_token}"})
    assert resp.status_code == 200

    # 11. Rider arrives
    resp = await client.put(f"/api/v1/delivery/orders/{order_id}/arrive?gps_lat=-1.28&gps_lon=36.82", headers={"Authorization": f"Bearer {rider_token}"})
    assert resp.status_code == 200

    # 12. Customer confirms delivery
    resp = await client.post(f"/api/v1/orders/{order_id}/confirm", json={"phone": phone})
    assert resp.status_code == 200
    assert resp.json()["status"] == "payment_pending"

    # 13. Verify payment record exists
    resp = await client.get(f"/api/v1/payments/orders/{order_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] in ("pending", "initiated")
