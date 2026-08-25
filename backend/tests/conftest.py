import pytest
import httpx

@pytest.fixture
def client():
    return httpx.Client(base_url="http://localhost:8000")
