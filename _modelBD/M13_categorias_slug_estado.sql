-- ==========================================================
-- MÓDULO 13: EXTENSIÓN DE CATEGORÍAS — slug + estado
-- Motor: PostgreSQL
-- Propósito: Añadir slug (SEO-friendly, python-slugify), estado
--            (soft delete), y restricciones de unicidad a la
--            tabla categorias. Índices adicionales de búsqueda.
-- Depende de: M03_catalogo_inventario.sql
-- ==========================================================

-- ── NUEVAS COLUMNAS ────────────────────────────────────────

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS slug VARCHAR(150);
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS estado BOOLEAN NOT NULL DEFAULT true;

-- ── GENERAR SLUGS PARA REGISTROS EXISTENTES ────────────────

UPDATE categorias
SET slug = lower(
             regexp_replace(
               translate(nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn'),
               '[^a-zA-Z0-9]+', '-', 'g'
             )
           )
WHERE slug IS NULL;

-- Eliminar trailing hyphens
UPDATE categorias SET slug = regexp_replace(slug, '-+$', '') WHERE slug LIKE '%-';

-- ── RESTRICCIONES DE UNICIDAD ──────────────────────────────

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

-- ── ÍNDICES ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_categorias_estado ON categorias (estado);
CREATE INDEX IF NOT EXISTS idx_categorias_slug ON categorias (slug);
