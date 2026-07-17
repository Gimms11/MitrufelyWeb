"""
Apply M16 migration: add avatar_url to usuarios table.

Run from _backEnd directory:
    python scripts/apply_migration_m16_avatar.py

Or inside Docker:
    docker compose exec api python scripts/apply_migration_m16_avatar.py
"""

import asyncio
import os
import sys
from pathlib import Path

import asyncpg

M16_SQL = r"""
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
"""


def load_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    os.environ[key] = val


async def main() -> None:
    load_env()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found in env or .env file", file=sys.stderr)
        sys.exit(1)

    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)

    print("Connecting to DB...")
    conn = await asyncpg.connect(db_url)
    print("Connected. Applying M16 migration (avatar_url on usuarios)...")

    try:
        await conn.execute(M16_SQL)
        print("M16 applied: avatar_url added to usuarios.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
