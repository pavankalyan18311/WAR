"""
Integration tests for Order endpoints.
Requires authenticated user + seeded product with stock.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestCreateOrder:

    @pytest.mark.asyncio
    async def test_create_order_unauthenticated_returns_401(self, client: AsyncClient, seed_data):
        res = await client.post("/api/orders", json={
            "items": [{"variant_id": str(seed_data["variant"].variant_id), "quantity": 1}],
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "line1": "123 Test St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
            },
            "payment_method": "cod",
        })
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_create_order_returns_201(
        self, client: AsyncClient, seed_data, auth_headers, test_user
    ):
        res = await client.post("/api/orders", headers=auth_headers, json={
            "items": [{"variant_id": str(seed_data["variant"].variant_id), "quantity": 2}],
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "line1": "123 Test St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
            },
            "payment_method": "cod",
        })
        assert res.status_code == 201
        data = res.json()
        assert "order_id" in data
        assert data["status"] == "pending"
        assert data["payment_method"] == "cod"

    @pytest.mark.asyncio
    async def test_order_deducts_stock(
        self, client: AsyncClient, seed_data, auth_headers
    ):
        # Get initial stock
        product_res = await client.get("/api/products/test-black-oversized")
        initial_stock = next(
            v["stock_quantity"]
            for v in product_res.json()["variants"]
            if v["size"] == "L"
        )

        await client.post("/api/orders", headers=auth_headers, json={
            "items": [{"variant_id": str(seed_data["variant"].variant_id), "quantity": 1}],
            "shipping_address": {
                "name": "Test User", "phone": "9876543210",
                "line1": "1 Test St", "city": "Mumbai",
                "state": "Maharashtra", "pincode": "400001",
            },
            "payment_method": "cod",
        })

        product_res_after = await client.get("/api/products/test-black-oversized")
        new_stock = next(
            v["stock_quantity"]
            for v in product_res_after.json()["variants"]
            if v["size"] == "L"
        )
        assert new_stock == initial_stock - 1


@pytest.mark.integration
class TestOrderHistory:

    @pytest.mark.asyncio
    async def test_list_orders_requires_auth(self, client: AsyncClient):
        res = await client.get("/api/orders")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_list_orders_returns_user_orders(
        self, client: AsyncClient, auth_headers
    ):
        res = await client.get("/api/orders", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_get_unknown_order_returns_404(
        self, client: AsyncClient, auth_headers
    ):
        res = await client.get(
            "/api/orders/00000000-0000-0000-0000-000000000000",
            headers=auth_headers
        )
        assert res.status_code == 404
