"""
Script de migración: Agregar soporte Google OAuth a la tabla usuarios.

Cambios:
1. password_hash → nullable (usuarios de Google no tienen contraseña local)
2. Agregar columna auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'
3. Agregar columna google_sub VARCHAR(255) UNIQUE (ID único de Google)
"""

import asyncio
import ssl
import asyncpg


DB_URL = (
    "postgresql://neondb_owner:npg_MmqrCbyd1pI6"
    "@ep-wild-bonus-ape8fnzh-pooler.c-7.us-east-1.aws.neon.tech/neondb"
)

MIGRATION_SQL = [
    # 1. Hacer password_hash nullable
    ("Make password_hash nullable", """
        ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
    """),

    # 2. Agregar auth_provider si no existe
    ("Add auth_provider column", """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'usuarios' AND column_name = 'auth_provider'
            ) THEN
                ALTER TABLE usuarios
                    ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
            END IF;
        END;
        $$;
    """),

    # 3. Agregar google_sub si no existe
    ("Add google_sub column", """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'usuarios' AND column_name = 'google_sub'
            ) THEN
                ALTER TABLE usuarios ADD COLUMN google_sub VARCHAR(255);
            END IF;
        END;
        $$;
    """),

    # 4. Índice parcial único en google_sub
    ("Create unique index on google_sub", """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = 'usuarios' AND indexname = 'uq_usuarios_google_sub'
            ) THEN
                CREATE UNIQUE INDEX uq_usuarios_google_sub
                    ON usuarios (google_sub)
                    WHERE google_sub IS NOT NULL;
            END IF;
        END;
        $$;
    """),
]


async def run_migration() -> None:
    ssl_ctx = ssl.create_default_context()
    conn = await asyncpg.connect(DB_URL, ssl=ssl_ctx)
    try:
        for description, sql in MIGRATION_SQL:
            await conn.execute(sql.strip())
            print(f"  [OK] {description}")

        # Verificar estado final de la tabla
        rows = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'usuarios'
            ORDER BY ordinal_position;
        """)

        print("\n[INFO] Estado final - tabla usuarios:")
        for r in rows:
            nullable = "NULL" if r["is_nullable"] == "YES" else "NOT NULL"
            default = f" DEFAULT {r['column_default']}" if r["column_default"] else ""
            print(f"  {r['column_name']}: {r['data_type']} {nullable}{default}")

    finally:
        await conn.close()


if __name__ == "__main__":
    print("[START] Iniciando migracion Google OAuth...\n")
    asyncio.run(run_migration())
    print("\n[DONE] Migracion completada exitosamente.")
