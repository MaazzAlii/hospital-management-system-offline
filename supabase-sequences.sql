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

-- 3. Synchronize sequence start values with existing database records (prevents duplicate collisions)
SELECT setval('mrn_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(mrn, POSITION('-' IN mrn) + 1) AS INTEGER)) FROM "Patient" WHERE mrn ~ '.*-[0-9]+$'), 0));
SELECT setval('invoice_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(invoiceNo, 5) AS INTEGER)) FROM "Invoice" WHERE invoiceNo ~ 'LCC-[0-9]+'), 0));
SELECT setval('purchase_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(purchaseNo, 5) AS INTEGER)) FROM "Purchase" WHERE purchaseNo ~ 'PUR-[0-9]+'), 0));
SELECT setval('sale_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(saleNo, 6) AS INTEGER)) FROM "Sale" WHERE saleNo ~ 'SALE-[0-9]+'), 0));
SELECT setval('lab_order_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(orderNo, 5) AS INTEGER)) FROM "LabOrder" WHERE orderNo ~ 'LAB-[0-9]+'), 0));
SELECT setval('sample_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(sampleNo, 5) AS INTEGER)) FROM "Sample" WHERE sampleNo ~ 'SMP-[0-9]+'), 0));
