"""
Integration tests for Product endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestProductList:

    @pytest.mark.asyncio
    async def test_list_products_returns_200(self, client: AsyncClient, seed_data):
        res = await client.get("/api/products")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_products_pagination(self, client: AsyncClient, seed_data):
        res = await client.get("/api/products?page=1&page_size=5")
        assert res.status_code == 200
        assert len(res.json()["items"]) <= 5

    @pytest.mark.asyncio
    async def test_filter_by_category_slug(self, client: AsyncClient, seed_data):
        res = await client.get("/api/products?category=oversized")
        assert res.status_code == 200
        items = res.json()["items"]
        assert len(items) >= 1

    @pytest.mark.asyncio
    async def test_sort_by_price_asc(self, client: AsyncClient, seed_data):
        res = await client.get("/api/products?sort=price_asc")
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_filter_by_price_range(self, client: AsyncClient, seed_data):
        res = await client.get("/api/products?min_price=500&max_price=1000")
        assert res.status_code == 200
        for item in res.json()["items"]:
            price = item.get("discount_price") or item["price"]
            assert 500 <= price <= 1000


@pytest.mark.integration
class TestProductDetail:

    @pytest.mark.asyncio
    async def test_get_product_by_valid_slug_returns_200(self, client: AsyncClient, seed_data):
        res = await client.get("/api/products/test-black-oversized")
        assert res.status_code == 200
        data = res.json()
        assert data["slug"] == "test-black-oversized"
        assert "variants" in data

    @pytest.mark.asyncio
    async def test_get_product_unknown_slug_returns_404(self, client: AsyncClient):
        res = await client.get("/api/products/non-existent-product")
        assert res.status_code == 404


@pytest.mark.integration
class TestCategories:

    @pytest.mark.asyncio
    async def test_list_categories_returns_200(self, client: AsyncClient, seed_data):
        res = await client.get("/api/products/categories")
        assert res.status_code == 200
        categories = res.json()
        assert len(categories) >= 1
        assert "slug" in categories[0]
        assert "name" in categories[0]
