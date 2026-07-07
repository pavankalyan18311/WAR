"""One-time script to create all DB tables from SQLAlchemy models."""
import asyncio
from app.core.database import engine, Base
from app.models import models  # noqa: registers all ORM classes


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("All tables created successfully.")


if __name__ == "__main__":
    asyncio.run(main())
