"""Unit tests for Resend-based email OTP flow."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_send_email_otp_returns_200(client: AsyncClient):
    """send-email-otp should call Resend and return 200."""
    with patch("app.routers.auth.settings") as mock_settings:
        mock_settings.RESEND_API_KEY = "re_test_key"
        mock_settings.EMAIL_FROM = "noreply@threadx.com"
        mock_settings.ENVIRONMENT = "development"

        with patch("app.routers.auth.redis_client") as mock_redis:
            mock_redis.setex = AsyncMock()

            with patch("app.routers.auth.httpx.AsyncClient") as mock_http:
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"id": "msg_test_123"}
                mock_http.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                    post=AsyncMock(return_value=mock_resp)
                ))
                mock_http.return_value.__aexit__ = AsyncMock(return_value=False)

                res = await client.post("/api/auth/send-email-otp", json={"email": "user@example.com"})

    assert res.status_code == 200
    assert res.json().get("message") == "OTP sent to email."


@pytest.mark.asyncio
async def test_verify_email_otp_correct_code(client: AsyncClient):
    """verify-email-otp with correct code should return 200."""
    with patch("app.routers.auth.redis_client") as mock_redis:
        mock_redis.get = AsyncMock(return_value=b"123456")
        mock_redis.delete = AsyncMock()

        res = await client.post("/api/auth/verify-email-otp", json={
            "email": "user@example.com",
            "otp": "123456",
        })

    assert res.status_code == 200
    assert res.json().get("verified") is True


@pytest.mark.asyncio
async def test_verify_email_otp_wrong_code_returns_400(client: AsyncClient):
    """verify-email-otp with wrong OTP should return 400."""
    with patch("app.routers.auth.redis_client") as mock_redis:
        mock_redis.get = AsyncMock(return_value=b"999999")

        res = await client.post("/api/auth/verify-email-otp", json={
            "email": "user@example.com",
            "otp": "123456",
        })

    assert res.status_code == 400
