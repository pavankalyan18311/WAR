"""
Unit tests for AI size recommendation and chat endpoints.
Tests the logic layer directly, no DB required.
"""
import pytest
from httpx import AsyncClient


class TestSizeRecommendationEndpoint:

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_recommends_L_for_chest_40(self, client: AsyncClient):
        res = await client.post("/api/ai/size-recommendation", json={
            "height": 175.0,
            "chest": 40.0,
            "weight": 72.0,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["recommended_size"] == "L"
        assert data["confidence"] > 0.5
        assert len(data["fit_notes"]) > 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_recommends_M_for_chest_37(self, client: AsyncClient):
        res = await client.post("/api/ai/size-recommendation", json={
            "height": 170.0,
            "chest": 37.0,
        })
        assert res.status_code == 200
        assert res.json()["recommended_size"] == "M"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_high_confidence_with_all_measurements(self, client: AsyncClient):
        res = await client.post("/api/ai/size-recommendation", json={
            "height": 178.0,
            "weight": 75.0,
            "chest": 40.0,
            "shoulder": 18.0,
            "waist": 34.0,
        })
        assert res.status_code == 200
        assert res.json()["confidence"] >= 0.85

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_minimal_input_still_returns_recommendation(self, client: AsyncClient):
        res = await client.post("/api/ai/size-recommendation", json={
            "height": 175.0,
        })
        assert res.status_code == 200
        assert res.json()["recommended_size"] in ["XS", "S", "M", "L", "XL", "XXL", "3XL"]


class TestChatEndpoint:

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_greeting_returns_welcome_message(self, client: AsyncClient):
        res = await client.post("/api/ai/chat", json={"message": "hello"})
        assert res.status_code == 200
        data = res.json()
        assert "reply" in data
        assert "conversation_id" in data
        assert len(data["reply"]) > 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_oversized_query_returns_products(self, client: AsyncClient):
        res = await client.post("/api/ai/chat", json={"message": "show me oversized tees"})
        assert res.status_code == 200
        assert "oversized" in res.json()["reply"].lower()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_returns_policy_info_for_return_query(self, client: AsyncClient):
        res = await client.post("/api/ai/chat", json={"message": "how do I return my order?"})
        assert res.status_code == 200
        reply = res.json()["reply"].lower()
        assert any(word in reply for word in ["return", "7-day", "refund"])

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_conversation_id_persisted_across_messages(self, client: AsyncClient):
        first = await client.post("/api/ai/chat", json={"message": "hi"})
        conv_id = first.json()["conversation_id"]

        second = await client.post("/api/ai/chat", json={
            "message": "what about sizes?",
            "conversation_id": conv_id,
        })
        assert second.json()["conversation_id"] == conv_id
