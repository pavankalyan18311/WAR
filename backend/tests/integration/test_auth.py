"""
Integration tests for Authentication endpoints.
Uses the in-memory SQLite DB via conftest fixtures.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestRegister:

    @pytest.mark.asyncio
    async def test_register_new_user_returns_201(self, client: AsyncClient):
        res = await client.post("/api/auth/register", json={
            "name": "Jane Doe",
            "email": "jane@threadx.com",
            "phone": "9876543210",
            "password": "Secure1234!",
        })
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "jane@threadx.com"
        assert data["user"]["role"] == "customer"

    @pytest.mark.asyncio
    async def test_register_duplicate_email_returns_409(self, client: AsyncClient):
        payload = {"name": "Dup User", "email": "dup@threadx.com", "password": "Secure1234!"}
        await client.post("/api/auth/register", json=payload)
        res = await client.post("/api/auth/register", json=payload)
        assert res.status_code == 409
        assert "already exists" in res.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_weak_password_returns_422(self, client: AsyncClient):
        res = await client.post("/api/auth/register", json={
            "name": "Weak Pass",
            "email": "weak@threadx.com",
            "password": "password",  # no uppercase, no special char
        })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email_returns_422(self, client: AsyncClient):
        res = await client.post("/api/auth/register", json={
            "name": "Bad Email",
            "email": "not-an-email",
            "password": "Secure1234!",
        })
        assert res.status_code == 422


@pytest.mark.integration
class TestLogin:

    @pytest.mark.asyncio
    async def test_login_valid_credentials_returns_200(self, client: AsyncClient, test_user):
        res = await client.post("/api/auth/login", json={
            "email": "test@threadx.com",
            "password": "Test1234!",
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@threadx.com"

    @pytest.mark.asyncio
    async def test_login_wrong_password_returns_401(self, client: AsyncClient, test_user):
        res = await client.post("/api/auth/login", json={
            "email": "test@threadx.com",
            "password": "WrongPass1!",
        })
        assert res.status_code == 401
        assert "Invalid" in res.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_nonexistent_email_returns_401(self, client: AsyncClient):
        res = await client.post("/api/auth/login", json={
            "email": "ghost@threadx.com",
            "password": "Test1234!",
        })
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_logout_returns_200(self, client: AsyncClient):
        res = await client.post("/api/auth/logout")
        assert res.status_code == 200
        assert "message" in res.json()
