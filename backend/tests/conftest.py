"""
Shared pytest fixtures for all test suites.
Integration tests use an in-memory SQLite DB (via aiosqlite) so no
real PostgreSQL is needed for local runs. CI spins up real containers.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.models import User, Category, Product, ProductVariant, ProductImage

# ─── Test database (SQLite in-memory) ────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """HTTP test client with overridden DB dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_data(db_session: AsyncSession):
    """Seed minimal test data."""
    # Category
    category = Category(id=1, name="Oversized", slug="oversized")
    db_session.add(category)

    # Product
    product = Product(
        sku="TEST-BLK-L",
        name="Test Black Oversized Tee",
        slug="test-black-oversized",
        description="Test product",
        price=1299.0,
        discount_price=899.0,
        category_id=1,
        stock_quantity=50,
        fit_type="oversized",
    )
    db_session.add(product)
    await db_session.flush()

    image = ProductImage(product_id=product.product_id, url="https://example.com/img.jpg")
    db_session.add(image)

    variant = ProductVariant(
        product_id=product.product_id,
        sku="TEST-BLK-L-VAR",
        color="Black",
        size="L",
        stock_quantity=10,
        price_override=899.0,
    )
    db_session.add(variant)
    await db_session.commit()
    return {"product": product, "variant": variant, "category": category}


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    """Create and return a test customer user."""
    user = User(
        name="Test User",
        email="test@threadx.com",
        password_hash=hash_password("Test1234!"),
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(client, test_user):
    """Return Authorization headers for authenticated requests."""
    res = await client.post("/api/auth/login", json={
        "email": "test@threadx.com",
        "password": "Test1234!"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
