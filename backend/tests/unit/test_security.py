"""
Unit tests for JWT token creation and decoding.
"""
import pytest
from datetime import timedelta
from app.core.security import create_access_token, decode_access_token


class TestJwtTokens:

    @pytest.mark.unit
    def test_create_and_decode_access_token(self):
        data = {"sub": "user-uuid-123", "role": "customer"}
        token = create_access_token(data)
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "user-uuid-123"
        assert decoded["role"] == "customer"

    @pytest.mark.unit
    def test_expired_token_returns_none(self):
        token = create_access_token(
            {"sub": "user-uuid-123"},
            expires_delta=timedelta(seconds=-1)  # already expired
        )
        result = decode_access_token(token)
        assert result is None

    @pytest.mark.unit
    def test_invalid_token_returns_none(self):
        result = decode_access_token("this.is.not.a.valid.jwt")
        assert result is None

    @pytest.mark.unit
    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "user-1"})
        tampered = token[:-5] + "XXXXX"
        result = decode_access_token(tampered)
        assert result is None

    @pytest.mark.unit
    def test_token_contains_expiry(self):
        token = create_access_token({"sub": "user-1"})
        decoded = decode_access_token(token)
        assert "exp" in decoded
