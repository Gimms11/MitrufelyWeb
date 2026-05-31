import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.infrastructure.database.session import database_engine

async def main():
    try:
        async with database_engine.begin() as conn:
            # Drop old constraints if they exist just in case
            await conn.execute(text("ALTER TABLE productos ADD COLUMN IF NOT EXISTS slug VARCHAR(150);"))
            await conn.execute(text("UPDATE productos SET slug = 'producto-' || id_producto WHERE slug IS NULL;"))
            await conn.execute(text("ALTER TABLE productos ADD CONSTRAINT uq_producto_slug UNIQUE (slug);"))
            
            await conn.execute(text("ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW();"))
            await conn.execute(text("ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW();"))
            
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_producto_activo_nombre ON productos (nombre) WHERE estado = true;"))
            print("Migración completada con éxito.")
    except Exception as e:
        print(f"Error en migración: {e}")
    finally:
        await database_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
