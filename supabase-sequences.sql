-- =============================================================================
-- POSTGRESQL SEQUENCES FOR ATOMIC & COLLISION-FREE ID GENERATION
-- =============================================================================

-- 1. Create sequences for each entity
CREATE SEQUENCE IF NOT EXISTS mrn_seq START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS purchase_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sale_seq START 1;
CREATE SEQUENCE IF NOT EXISTS lab_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sample_seq START 1;

-- 2. Create RPC function to get next sequence value atomically via Supabase client
CREATE OR REPLACE FUNCTION nextval(seq_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result bigint;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO result;
  RETURN result;
END;
$$;

-- 3. Helper function to extract numeric suffix after the last dash from any ID format (e.g. LCC-2026-0042 -> 42)
CREATE OR REPLACE FUNCTION extract_last_number(val text) 
RETURNS INTEGER AS $$
BEGIN
  IF val IS NULL OR val = '' THEN
    RETURN 0;
  END IF;
  RETURN COALESCE((REGEXP_MATCHES(val, '-([0-9]+)$'))[1]::INTEGER, 0);
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Synchronize sequence start values with maximum numeric suffixes found in existing database records
SELECT setval('mrn_seq', COALESCE((SELECT MAX(extract_last_number(mrn)) FROM "Patient"), 0));
SELECT setval('invoice_seq', COALESCE((SELECT MAX(extract_last_number("invoiceNo")) FROM "Invoice"), 0));
SELECT setval('purchase_seq', COALESCE((SELECT MAX(extract_last_number("purchaseNo")) FROM "Purchase"), 0));
SELECT setval('sale_seq', COALESCE((SELECT MAX(extract_last_number("saleNo")) FROM "Sale"), 0));
SELECT setval('lab_order_seq', COALESCE((SELECT MAX(extract_last_number("orderNo")) FROM "LabOrder"), 0));
SELECT setval('sample_seq', COALESCE((SELECT MAX(extract_last_number("sampleNo")) FROM "Sample"), 0));
