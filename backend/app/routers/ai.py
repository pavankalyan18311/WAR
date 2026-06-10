from fastapi import APIRouter
from app.schemas.schemas import (
    SizeRecommendationRequest,
    SizeRecommendationResponse,
    ChatMessageRequest,
    ChatMessageResponse,
)
import uuid

router = APIRouter(prefix="/ai", tags=["AI"])

# Size chart thresholds (simplified ML model)
SIZE_CHART = [
    ("XS", 30, 34, 14, 16),
    ("S",  34, 36, 15, 17),
    ("M",  36, 38, 16, 18),
    ("L",  38, 42, 17, 19),
    ("XL", 42, 46, 18, 20),
    ("XXL", 46, 50, 19, 22),
]


@router.post("/size-recommendation", response_model=SizeRecommendationResponse)
async def recommend_size(payload: SizeRecommendationRequest):
    """
    AI-based size recommendation using body measurements.
    Confidence scoring based on number of measurements provided.
    """
    chest = payload.chest
    measurements_provided = sum([
        payload.height is not None,
        payload.weight is not None,
        payload.chest is not None,
        payload.shoulder is not None,
        payload.waist is not None,
    ])
    confidence = min(0.95, 0.5 + (measurements_provided * 0.09))

    # Primary recommendation from chest measurement
    recommended = "M"
    fit_notes = []

    if chest:
        for size, min_c, max_c, _, _ in SIZE_CHART:
            if min_c <= chest < max_c:
                recommended = size
                break
        fit_notes.append(f"Based on chest measurement of {chest} inches")

    elif payload.height and payload.weight:
        bmi = payload.weight / ((payload.height / 100) ** 2)
        if bmi < 18.5:
            recommended = "S"
        elif bmi < 23:
            recommended = "M"
        elif bmi < 27:
            recommended = "L"
        else:
            recommended = "XL"
        fit_notes.append("Based on height and weight estimation")

    fit_notes.append("Oversized fit — consider sizing down for a regular look")
    fit_notes.append("This style has a relaxed shoulder drop of 2 inches")

    return SizeRecommendationResponse(
        recommended_size=recommended,
        confidence=round(confidence, 2),
        fit_notes=fit_notes,
    )


@router.post("/chat", response_model=ChatMessageResponse)
async def chat(payload: ChatMessageRequest):
    """
    RAG-powered AI chatbot endpoint.
    In production: uses PGVector semantic search + LLM (OpenAI/Anthropic).
    """
    conversation_id = payload.conversation_id or str(uuid.uuid4())

    # Simplified intent matching (production uses LLM intent classifier)
    message_lower = payload.message.lower()

    if any(word in message_lower for word in ["oversized", "baggy", "loose"]):
        reply = "Here are our top oversized t-shirts! Made from 240 GSM premium cotton for that perfect relaxed fit."
    elif any(word in message_lower for word in ["size", "fit", "measure"]):
        reply = "You can use our AI Size Recommender — share your height, weight, and chest measurement and I'll find your perfect size! Or try our Virtual Try-On to see how it looks on you."
    elif any(word in message_lower for word in ["return", "refund"]):
        reply = "We offer hassle-free 7-day returns with no questions asked. Just go to My Account > Orders and raise a return request."
    elif any(word in message_lower for word in ["shipping", "delivery"]):
        reply = "We offer free shipping on all orders above ₹999. Standard delivery takes 3-5 business days. Express delivery (1-2 days) is available at ₹149."
    elif any(word in message_lower for word in ["track", "order status"]):
        reply = "You can track your order in My Account > Orders. You'll also receive SMS and email updates at every stage."
    else:
        reply = "Hi there! 👋 I'm your ThreadX AI assistant. I can help you find the perfect t-shirt, check sizes, or answer any questions. What would you like to know?"

    return ChatMessageResponse(reply=reply, conversation_id=conversation_id)
