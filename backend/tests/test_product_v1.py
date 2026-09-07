import concurrent.futures
import httpx
import time

BASE = "http://localhost:8000"

def register_and_login(email):
    c = httpx.Client(base_url=BASE)
    c.post("/api/v1/auth/register", json={"email": email, "password": "test123", "role": "owner"})
    r = c.post("/api/v1/auth/login", json={"email": email, "password": "test123"})
    return r.json()["access_token"]

def create_business(token):
    c = httpx.Client(base_url=BASE)
    r = c.post("/api/v1/businesses", json={
        "name": "P5 Test Store",
        "category_id": 1,
        "location": {"lat": -1.28, "lon": 36.82},
        "operating_hours": [],
        "payment_method": {"type": "till", "account_number": "999999"},
        "payment_model": "credit",
    }, headers={"Authorization": f"Bearer {token}"})
    return r.json()["id"]

def create_product(token, business_id, stock=5):
    c = httpx.Client(base_url=BASE)
    r = c.post(f"/api/v1/businesses/{business_id}/products", json={
        "name": "StockItem",
        "original_price": 100,
        "currency": "KES",
        "selling_unit": "Piece",
        "track_inventory": True,
        "stock_quantity": stock,
        "min_order_quantity": 1,
    }, headers={"Authorization": f"Bearer {token}"})
    return r.json()["id"]

def test_atomic_stock_concurrency():
    email = f"p5-atomic-{time.time_ns()}@test.com"
    token = register_and_login(email)
    business_id = create_business(token)
    product_id = create_product(token, business_id, stock=5)

    def make_order(qty):
        c = httpx.Client(base_url=BASE)
        r = c.post("/api/v1/orders", json={
            "phone": "0712345678",
            "business_id": business_id,
            "items": [{"product_id": product_id, "quantity": qty}],
            "delivery_lat": -1.286,
            "delivery_lon": 36.817,
        })
        return r.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futures = [ex.submit(make_order, 1) for _ in range(10)]
        results = [f.result() for f in futures]

    assert results.count(201) == 5, f"Expected 5 successful, got {results.count(201)}"
    assert results.count(400) == 5, f"Expected 5 rejected, got {results.count(400)}"
