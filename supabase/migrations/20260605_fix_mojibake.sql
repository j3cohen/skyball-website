-- Fix UTF-8 mojibake in order text fields.
-- Cause: old Stripe CSV imports used XLSX.read(arrayBuffer) without specifying
-- encoding, so the library treated UTF-8 bytes as Latin-1. Each 3-byte UTF-8
-- sequence was stored as 3 separate characters.
--
-- Only two patterns appear in the data:
--   â + U+0080 + U+0093  →  – (en dash, U+2013, UTF-8: E2 80 93)
--   â + U+0080 + U+0094  →  — (em dash, U+2014, UTF-8: E2 80 94)

CREATE OR REPLACE FUNCTION fix_mojibake(s text) RETURNS text AS $$
BEGIN
  RETURN replace(replace(
    s,
    chr(226)||chr(128)||chr(147), '–'),   -- en dash U+2013
    chr(226)||chr(128)||chr(148), '—');   -- em dash U+2014
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Fix order_summary (plain text column)
UPDATE orders
SET order_summary = fix_mojibake(order_summary)
WHERE order_summary IS NOT NULL
  AND order_summary LIKE '%' || chr(226) || chr(128) || '%';

-- Fix product names inside order_data JSONB
UPDATE orders
SET order_data = fix_mojibake(order_data::text)::jsonb
WHERE order_data IS NOT NULL
  AND order_data::text LIKE '%' || chr(226) || chr(128) || '%';

DROP FUNCTION fix_mojibake(text);
