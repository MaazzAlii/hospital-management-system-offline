-- =============================================================================
-- ATOMIC SALE CREATION WITH ROW-LEVEL STOCK LOCKING (PREVENTS TOCTOU RACES)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_sale_with_stock_check(sale_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sale_id UUID;
  item jsonb;
  available_qty NUMERIC;
  sale_no TEXT;
  medicine_name TEXT;
BEGIN
  -- Generate sale number using sequence if not explicitly provided
  IF sale_data->>'saleNo' IS NOT NULL AND sale_data->>'saleNo' != '' THEN
    sale_no := sale_data->>'saleNo';
  ELSE
    SELECT 'SALE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('sale_seq')::TEXT, 4, '0') INTO sale_no;
  END IF;

  -- 1. Loop over items to check stock with row-level locking (FOR UPDATE)
  FOR item IN SELECT * FROM jsonb_array_elements(sale_data->'items')
  LOOP
    -- Lock all stock movements for this medicine to prevent concurrent modifications
    PERFORM 1
    FROM "StockMovement"
    WHERE "medicineId" = (item->>'medicineId')::UUID
    FOR UPDATE;

    -- Compute available stock (sum of all movements)
    SELECT COALESCE(SUM(quantity), 0)
    INTO available_qty
    FROM "StockMovement"
    WHERE "medicineId" = (item->>'medicineId')::UUID;

    IF available_qty < (item->>'quantity')::NUMERIC THEN
      -- Fetch medicine name for detailed exception message
      SELECT name INTO medicine_name FROM "Medicine" WHERE id = (item->>'medicineId')::UUID;
      RAISE EXCEPTION 'Quantity for medicine % exceeds available stock (%).', COALESCE(medicine_name, item->>'medicineId'), available_qty;
    END IF;
  END LOOP;

  -- 2. All stock checks passed -> Insert Sale record
  INSERT INTO "Sale" (
    "saleNo",
    "patientId",
    "totalAmount",
    "status",
    "createdAt"
  ) VALUES (
    sale_no,
    NULLIF(sale_data->>'patientId', '')::UUID,
    (sale_data->>'totalAmount')::NUMERIC,
    COALESCE(sale_data->>'status', 'completed'),
    NOW()
  )
  RETURNING id INTO sale_id;

  -- 3. Insert SaleItems and negative StockMovement entries atomically
  FOR item IN SELECT * FROM jsonb_array_elements(sale_data->'items')
  LOOP
    -- Insert SaleItem
    INSERT INTO "SaleItem" (
      "saleId",
      "medicineId",
      "quantity",
      "outPrice",
      "total"
    ) VALUES (
      sale_id,
      (item->>'medicineId')::UUID,
      (item->>'quantity')::NUMERIC,
      (item->>'outPrice')::NUMERIC,
      COALESCE((item->>'total')::NUMERIC, (item->>'quantity')::NUMERIC * (item->>'outPrice')::NUMERIC)
    );

    -- Insert negative StockMovement for this sale
    INSERT INTO "StockMovement" (
      "medicineId",
      "quantity",
      "type",
      "referenceId",
      "notes",
      "createdAt"
    ) VALUES (
      (item->>'medicineId')::UUID,
      -ABS((item->>'quantity')::NUMERIC),
      'sale',
      sale_id,
      'Sale ' || sale_no,
      NOW()
    );
  END LOOP;

  -- Return success response object
  RETURN jsonb_build_object(
    'success', true,
    'id', sale_id,
    'saleNo', sale_no
  );
END;
$$;
