"""
Apply M14 migration: add base_imponible + igv to ventas table.

Run from _backEnd directory:
    python scripts/apply_migration_m14.py

Or inside Docker:
    docker compose exec api python scripts/apply_migration_m14.py
"""

import asyncio
import os
import sys
from pathlib import Path

import asyncpg

M14_SQL = r"""
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS base_imponible NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS igv NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add CHECK constraints (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_ventas_base_imponible'
      AND conrelid = 'ventas'::regclass
  ) THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_base_imponible CHECK (base_imponible >= 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_ventas_igv'
      AND conrelid = 'ventas'::regclass
  ) THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_igv CHECK (igv >= 0);
  END IF;
END
$$;
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
    print("Connected. Applying M14 migration (base_imponible + igv on ventas)...")

    try:
        await conn.execute(M14_SQL)
        print("M14 applied: base_imponible + igv added to ventas.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
