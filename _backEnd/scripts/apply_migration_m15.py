"""
Apply M15 migration: add telefono to clientes table.

Run from _backEnd directory:
    python scripts/apply_migration_m15.py

Or inside Docker:
    docker compose exec api python scripts/apply_migration_m15.py
"""

import asyncio
import os
import sys
from pathlib import Path

import asyncpg

M15_SQL = r"""
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
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

    print("Connecting to NeonDB...")
    conn = await asyncpg.connect(db_url)
    print("Connected. Applying M15 migration (telefono on clientes)...")

    try:
        await conn.execute(M15_SQL)
        print("M15 applied: telefono added to clientes.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
