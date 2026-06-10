# 05 — AI Chatbot (RAG-Powered)

## Overview

The AI Chatbot is a Retrieval-Augmented Generation (RAG) assistant embedded in the storefront. It helps users discover products, get size guidance, resolve support queries, and track orders — all through a natural conversation interface.

---

## Objectives

| Objective | Description |
|-----------|-------------|
| Product Discovery | Help users find the right product through conversation |
| Customer Support | Answer policy, shipping, and returns questions |
| Size Guidance | Recommend the right size based on measurements |
| Order Support | Provide live order status and tracking info |

---

## Knowledge Sources

| Source | Content | Update Frequency |
|--------|---------|-----------------|
| Product Catalog | Names, descriptions, prices, availability, fabric info | Real-time sync |
| FAQs | Common customer questions and answers | Manual update |
| Policies | Shipping, returns, refunds, privacy policy | Manual update |
| Order Data | User's own order history and status | Real-time lookup |
| User Profile | Saved measurements, size preferences, purchase history | Real-time lookup |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend Chat Widget                │
│    (floating button → slide-in drawer on all pages) │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket / HTTP
┌──────────────────────▼──────────────────────────────┐
│               Chatbot Backend Service                 │
│                                                       │
│  1. Intent Classifier                                 │
│       ↓                                              │
│  2. Retrieval Layer                                   │
│     ├─ PGVector semantic search (products, FAQs)     │
│     └─ Direct DB lookup (orders, user profile)       │
│       ↓                                              │
│  3. Context Builder                                   │
│     └─ Assembles retrieved docs + conversation hist  │
│       ↓                                              │
│  4. LLM Service (OpenAI / Anthropic)                 │
│       ↓                                              │
│  5. Response Formatter                               │
│     └─ Injects product cards, CTAs, order details   │
└─────────────────────────────────────────────────────┘
```

---

## Conversation Types

### 1. Sales / Product Discovery

**Triggers:** User asks for product recommendations, style advice, or searches by description.

**Flow:**
1. Extract intent and attributes from message (colour, fit, occasion, budget)
2. Run semantic search against product embeddings in PGVector
3. Filter results by availability and attributes
4. Return top 3–5 products with images, prices, and "Add to Cart" / "Try On" CTAs

**Example:**
```
User:  I need something casual for a beach trip, under ₹1500
Bot:   Here are some great options for your beach trip! 🌊
       [Product Card: Graphic Tee - ₹999]
       [Product Card: Oversized Linen Tee - ₹1299]
       Would you like to try any of these on virtually?
```

---

### 2. Size Guidance

**Triggers:** User asks about sizing, fit, or what size to order.

**Flow:**
1. Ask for height, weight, and chest measurement (if not saved)
2. Call Size Recommendation service
3. Return recommended size with confidence score and fit explanation

**Example:**
```
User:  I'm 5'11", 78kg — what size should I get?
Bot:   Based on your measurements, I'd recommend a **Large**.
       Confidence: 91% — this is a great fit for our Regular and
       Oversized styles. For Slim Fit styles, consider Medium.
```

---

### 3. Customer Support

**Triggers:** Questions about shipping, returns, payment, account.

**Flow:**
1. Classify as support intent
2. Retrieve relevant policy from vector store
3. Generate grounded answer from policy content
4. Offer escalation to human support if needed

**Example:**
```
User:  How long does shipping take?
Bot:   Standard shipping takes 5–7 business days. Express
       shipping (2–3 days) is available at checkout for an
       additional ₹99. Would you like to track an existing order?
```

---

### 4. Order Tracking

**Triggers:** User asks about their order status, delivery, or returns.

**Flow:**
1. Verify user is authenticated
2. Look up latest order(s) from database
3. Return order status, estimated delivery, and tracking link

**Example:**
```
User:  Where is my order?
Bot:   Your order #ORD-2024-8821 is currently **Shipped** 📦
       Estimated delivery: 14 Nov 2024
       [Track Order →]
```

---

## Retrieval Layer

### Semantic Search (PGVector)

Products, FAQs, and policies are embedded using a sentence-transformer model and stored in PGVector.

```sql
-- Similarity search for products
SELECT id, name, price, description
FROM products
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

**Embedding model:** `text-embedding-3-small` (OpenAI) or equivalent  
**Index type:** HNSW (Hierarchical Navigable Small World)  
**Distance metric:** Cosine similarity

### Direct Lookup (Database)

Orders and user profile data are fetched directly from PostgreSQL (not via vector search).

---

## Conversation Memory

Each chat session stores up to **10 turns** of conversation history in Redis for context continuity.

```json
{
  "session_id": "sess_abc123",
  "user_id": "user-uuid",
  "messages": [
    { "role": "user", "content": "I need a casual tee" },
    { "role": "assistant", "content": "Here are some options..." }
  ],
  "created_at": "2024-11-01T10:00:00Z",
  "expires_at": "2024-11-01T11:00:00Z"
}
```

**Session TTL:** 1 hour from last message  
**Persistent history:** Last 20 sessions stored in `chat_sessions` table for logged-in users

---

## Database Tables

### `chat_sessions`

| Column | Type |
|--------|------|
| `id` | UUID |
| `user_id` | UUID (nullable) |
| `session_token` | String (for guest sessions) |
| `started_at` | Timestamp |
| `ended_at` | Timestamp |

### `chat_messages`

| Column | Type |
|--------|------|
| `id` | UUID |
| `session_id` | UUID |
| `role` | Enum: `user` \| `assistant` |
| `content` | Text |
| `intent` | String (classified intent) |
| `retrieved_context` | JSONB (for audit/debug) |
| `created_at` | Timestamp |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send a message, receive response |
| GET | `/api/chat/sessions` | User's chat session history (auth) |
| GET | `/api/chat/sessions/:id` | Full session transcript |
| DELETE | `/api/chat/sessions/:id` | Delete a session |

### Request: `POST /api/chat/message`

```json
{
  "session_id": "sess_abc123",
  "message": "What sizes do you have for this product?"
}
```

### Response

```json
{
  "session_id": "sess_abc123",
  "reply": "This product is available in S, M, L, and XL...",
  "intent": "product_inquiry",
  "products": [
    { "id": "uuid", "name": "Classic Tee", "price": 999, "image_url": "..." }
  ],
  "actions": [
    { "label": "Try On", "action": "open_tryon", "product_id": "uuid" },
    { "label": "Add to Cart", "action": "add_to_cart", "product_id": "uuid" }
  ]
}
```

---

## Intent Classification

| Intent | Description |
|--------|-------------|
| `product_discovery` | User looking for product recommendations |
| `product_inquiry` | Questions about a specific product |
| `size_guidance` | Sizing help |
| `order_tracking` | Order status query |
| `returns_support` | Return/refund enquiry |
| `shipping_support` | Shipping policy / delivery timeframes |
| `payment_support` | Payment method / COD / UPI questions |
| `general_support` | Other support queries |
| `smalltalk` | Greetings and off-topic |

---

## Guardrails & Safety

- The chatbot only answers questions within its defined knowledge scope.
- It will not provide medical, legal, or financial advice.
- Offensive or abusive messages trigger a polite refusal and escalation option.
- All LLM calls include a system prompt enforcing factual, grounded responses.
- Responses are audited in `chat_messages.retrieved_context` for quality review.
