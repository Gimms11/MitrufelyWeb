"""
Apply M13 migration: add slug + estado to categorias table.

Run from _backEnd directory:
    python scripts/apply_migration_m13.py

Or inside Docker:
    docker compose exec api python scripts/apply_migration_m13.py
"""

import asyncio
import os
import sys
from pathlib import Path

import asyncpg

M13_SQL = r"""
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS slug VARCHAR(150);
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS estado BOOLEAN NOT NULL DEFAULT true;

-- Generate slugs for existing rows using a basic PostgreSQL slugification
UPDATE categorias
SET slug = lower(
             regexp_replace(
               translate(nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn'),
               '[^a-zA-Z0-9]+', '-', 'g'
             )
           )
WHERE slug IS NULL;

-- Eliminate trailing hyphens
UPDATE categorias SET slug = regexp_replace(slug, '-+$', '') WHERE slug LIKE '%-';

-- Unique constraint on nombre
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_categorias_nombre'
      AND conrelid = 'categorias'::regclass
  ) THEN
    ALTER TABLE categorias ADD CONSTRAINT uq_categorias_nombre UNIQUE (nombre);
  END IF;
END
$$;

-- Unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_categorias_slug'
      AND conrelid = 'categorias'::regclass
  ) THEN
    ALTER TABLE categorias ADD CONSTRAINT uq_categorias_slug UNIQUE (slug);
  END IF;
END
$$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_categorias_estado ON categorias (estado);
CREATE INDEX IF NOT EXISTS idx_categorias_slug ON categorias (slug);
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
    print("Connected. Applying M13 migration (slug + estado on categorias)...")

    try:
        await conn.execute(M13_SQL)
        print("M13 applied: slug + estado, unique constraints, and indices added to categorias.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
