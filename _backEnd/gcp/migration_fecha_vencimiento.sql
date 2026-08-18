-- ==============================================================================
-- Mifrufely Web — Migration: fecha_vencimiento TIMESTAMP → DATE
-- Run this ONCE against NeonDB before deploying the updated backend.
-- ==============================================================================

-- 1. Alter column type (truncates time component, keeps the date)
ALTER TABLE lotes
  ALTER COLUMN fecha_vencimiento TYPE DATE
  USING fecha_vencimiento::DATE;

-- 2. Update the stored procedure to compare with CURRENT_DATE instead of NOW()
CREATE OR REPLACE FUNCTION sp_expirar_lotes_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_lote RECORD;
BEGIN
  -- Detect lots VIGENTE with fecha_vencimiento <= CURRENT_DATE (was NOW())
  FOR v_lote IN
    SELECT l.id_lote, l.id_producto, l.cantidad_disponible
    FROM lotes l
    WHERE l.estado_lote = 'VIGENTE'
      AND l.fecha_vencimiento IS NOT NULL
      AND l.fecha_vencimiento <= CURRENT_DATE
    FOR UPDATE OF l
  LOOP
    -- Mark as VENCIDO
    UPDATE lotes
    SET estado_lote = 'VENCIDO'
    WHERE id_lote = v_lote.id_lote;

    -- Subtract available stock from product
    UPDATE productos
    SET stock_actual = stock_actual - v_lote.cantidad_disponible
    WHERE id_producto = v_lote.id_producto;

    -- Register VENCIMIENTO movement in Kardex
    INSERT INTO movimientos_stock (
      id_producto, id_lote, tipo_movimiento,
      cantidad, stock_resultante, observacion
    )
    SELECT
      v_lote.id_producto,
      v_lote.id_lote,
      'VENCIMIENTO',
      v_lote.cantidad_disponible,
      p.stock_actual,
      'Expiración automática por fecha de vencimiento'
    FROM productos p
    WHERE p.id_producto = v_lote.id_producto;

    -- Zero out lote disponible
    UPDATE lotes
    SET cantidad_disponible = 0
    WHERE id_lote = v_lote.id_lote;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3. Verify
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'lotes' AND column_name = 'fecha_vencimiento';
-- Expected: data_type = 'date'
