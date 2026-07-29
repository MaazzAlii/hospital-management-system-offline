-- =====================================================
-- Enable RLS on all tables
-- =====================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Doctor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DoctorSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpdVisit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Medicine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicineCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabTest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferenceRange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper function: get current user's role name
-- =====================================================

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT r.name
  FROM "User" u
  JOIN "Role" r ON u."roleId" = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- =====================================================
-- HELPER: Check if user has a specific role
-- =====================================================

CREATE OR REPLACE FUNCTION user_has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "User" u
    JOIN "Role" r ON u."roleId" = r.id
    WHERE u.id = auth.uid()
      AND CASE
        -- 'admin' matches either admin variant
        WHEN LOWER(role_name) = 'admin' THEN
          LOWER(r.name) IN ('super admin', 'hospital admin')
        -- 'lab' matches both lab role variants
        WHEN LOWER(role_name) = 'lab' THEN
          LOWER(r.name) IN ('lab technician', 'pathologist')
        -- all other calls: case-insensitive match (receptionist, doctor, pharmacist, cashier)
        ELSE
          LOWER(r.name) = LOWER(role_name)
      END
  );
$$;

-- =====================================================
-- POLICIES FOR EACH TABLE
-- =====================================================

-- ---------- User ----------
DROP POLICY IF EXISTS "User read self or admin" ON "User";
DROP POLICY IF EXISTS "User write admin only" ON "User";

CREATE POLICY "User read self or admin" ON "User"
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR user_has_role('admin')
  );

CREATE POLICY "User write admin only" ON "User"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

-- ---------- Role, Permission, RolePermission ----------
DROP POLICY IF EXISTS "Role admin only" ON "Role";
CREATE POLICY "Role admin only" ON "Role"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'));

DROP POLICY IF EXISTS "Permission admin only" ON "Permission";
CREATE POLICY "Permission admin only" ON "Permission"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'));

DROP POLICY IF EXISTS "RolePermission admin only" ON "RolePermission";
CREATE POLICY "RolePermission admin only" ON "RolePermission"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'));

-- ---------- Settings ----------
DROP POLICY IF EXISTS "Settings admin only" ON "Settings";
CREATE POLICY "Settings admin only" ON "Settings"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'));

-- ---------- AuditLog ----------
DROP POLICY IF EXISTS "AuditLog admin read only" ON "AuditLog";
CREATE POLICY "AuditLog admin read only" ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING (user_has_role('admin'));

-- ---------- Notification ----------
DROP POLICY IF EXISTS "Notification read own or admin" ON "Notification";
DROP POLICY IF EXISTS "Notification write system only" ON "Notification";

CREATE POLICY "Notification read own or admin" ON "Notification"
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = "userId" OR user_has_role('admin')
  );

CREATE POLICY "Notification write system only" ON "Notification"
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_role('admin'));

-- ---------- Patient ----------
DROP POLICY IF EXISTS "Patient read all" ON "Patient";
DROP POLICY IF EXISTS "Patient write allowed roles" ON "Patient";
DROP POLICY IF EXISTS "Patient update allowed roles" ON "Patient";
DROP POLICY IF EXISTS "Patient delete admin only" ON "Patient";

CREATE POLICY "Patient read all" ON "Patient"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Patient write allowed roles" ON "Patient"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role('admin') OR 
    user_has_role('receptionist') OR 
    user_has_role('doctor')
  );

CREATE POLICY "Patient update allowed roles" ON "Patient"
  FOR UPDATE
  TO authenticated
  USING (
    user_has_role('admin') OR 
    user_has_role('receptionist') OR 
    user_has_role('doctor')
  )
  WITH CHECK (
    user_has_role('admin') OR 
    user_has_role('receptionist') OR 
    user_has_role('doctor')
  );

CREATE POLICY "Patient delete admin only" ON "Patient"
  FOR DELETE
  TO authenticated
  USING (user_has_role('admin'));

-- ---------- Doctor ----------
DROP POLICY IF EXISTS "Doctor read all" ON "Doctor";
DROP POLICY IF EXISTS "Doctor write admin only" ON "Doctor";

CREATE POLICY "Doctor read all" ON "Doctor"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctor write admin only" ON "Doctor"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

-- ---------- DoctorSchedule ----------
DROP POLICY IF EXISTS "DoctorSchedule read all" ON "DoctorSchedule";
DROP POLICY IF EXISTS "DoctorSchedule write admin only" ON "DoctorSchedule";

CREATE POLICY "DoctorSchedule read all" ON "DoctorSchedule"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "DoctorSchedule write admin only" ON "DoctorSchedule"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'));

-- ---------- Appointment ----------
DROP POLICY IF EXISTS "Appointment read all" ON "Appointment";
DROP POLICY IF EXISTS "Appointment write allowed roles" ON "Appointment";
DROP POLICY IF EXISTS "Appointment update allowed roles" ON "Appointment";
DROP POLICY IF EXISTS "Appointment delete admin only" ON "Appointment";

CREATE POLICY "Appointment read all" ON "Appointment"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Appointment write allowed roles" ON "Appointment"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role('admin') OR 
    user_has_role('receptionist') OR 
    (user_has_role('doctor') AND 
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  );

CREATE POLICY "Appointment update allowed roles" ON "Appointment"
  FOR UPDATE
  TO authenticated
  USING (
    user_has_role('admin') OR 
    user_has_role('receptionist') OR 
    (user_has_role('doctor') AND 
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  )
  WITH CHECK (
    user_has_role('admin') OR 
    user_has_role('receptionist') OR 
    (user_has_role('doctor') AND 
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  );

CREATE POLICY "Appointment delete admin only" ON "Appointment"
  FOR DELETE
  TO authenticated
  USING (user_has_role('admin'));

-- ---------- OpdVisit ----------
DROP POLICY IF EXISTS "OpdVisit read all" ON "OpdVisit";
DROP POLICY IF EXISTS "OpdVisit write allowed roles" ON "OpdVisit";
DROP POLICY IF EXISTS "OpdVisit update allowed roles" ON "OpdVisit";
DROP POLICY IF EXISTS "OpdVisit delete admin only" ON "OpdVisit";

CREATE POLICY "OpdVisit read all" ON "OpdVisit"
  FOR SELECT
  TO authenticated
  USING (true);

-- OpdVisit write: permissions.ts gives Receptionist NO access to 'opd' module.
-- Only Doctor (own) and Admin can write OPD visits.
CREATE POLICY "OpdVisit write allowed roles" ON "OpdVisit"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role('admin') OR
    (user_has_role('doctor') AND
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  );

CREATE POLICY "OpdVisit update allowed roles" ON "OpdVisit"
  FOR UPDATE
  TO authenticated
  USING (
    user_has_role('admin') OR
    (user_has_role('doctor') AND
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  )
  WITH CHECK (
    user_has_role('admin') OR
    (user_has_role('doctor') AND
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  );

CREATE POLICY "OpdVisit delete admin only" ON "OpdVisit"
  FOR DELETE
  TO authenticated
  USING (user_has_role('admin'));

-- ---------- Invoice, InvoiceItem, Payment ----------
DROP POLICY IF EXISTS "Invoice read all" ON "Invoice";
DROP POLICY IF EXISTS "Invoice write allowed roles" ON "Invoice";

CREATE POLICY "Invoice read all" ON "Invoice"
  FOR SELECT
  TO authenticated
  USING (true);

-- Invoice write: billing.ts (billing write = admin/receptionist/cashier),
-- sale.ts (pharmacy write = admin/pharmacist), lab-order.ts (lab write = admin/lab/doctor)
CREATE POLICY "Invoice write allowed roles" ON "Invoice"
  FOR ALL
  TO authenticated
  USING (
    user_has_role('admin') OR
    user_has_role('receptionist') OR
    user_has_role('cashier') OR
    user_has_role('pharmacist') OR
    user_has_role('lab') OR
    user_has_role('doctor')
  )
  WITH CHECK (
    user_has_role('admin') OR
    user_has_role('receptionist') OR
    user_has_role('cashier') OR
    user_has_role('pharmacist') OR
    user_has_role('lab') OR
    user_has_role('doctor')
  );

DROP POLICY IF EXISTS "InvoiceItem read all" ON "InvoiceItem";
DROP POLICY IF EXISTS "InvoiceItem write allowed roles" ON "InvoiceItem";

CREATE POLICY "InvoiceItem read all" ON "InvoiceItem"
  FOR SELECT
  TO authenticated
  USING (true);

-- InvoiceItem write: same roles as Invoice (all three action files insert items)
CREATE POLICY "InvoiceItem write allowed roles" ON "InvoiceItem"
  FOR ALL
  TO authenticated
  USING (
    user_has_role('admin') OR
    user_has_role('receptionist') OR
    user_has_role('cashier') OR
    user_has_role('pharmacist') OR
    user_has_role('lab') OR
    user_has_role('doctor')
  )
  WITH CHECK (
    user_has_role('admin') OR
    user_has_role('receptionist') OR
    user_has_role('cashier') OR
    user_has_role('pharmacist') OR
    user_has_role('lab') OR
    user_has_role('doctor')
  );

DROP POLICY IF EXISTS "Payment read all" ON "Payment";
DROP POLICY IF EXISTS "Payment write allowed roles" ON "Payment";

CREATE POLICY "Payment read all" ON "Payment"
  FOR SELECT
  TO authenticated
  USING (true);

-- Payment write: only billing.ts inserts into Payment (no pharmacy/lab side effects)
CREATE POLICY "Payment write allowed roles" ON "Payment"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin') OR user_has_role('receptionist') OR user_has_role('cashier'))
  WITH CHECK (user_has_role('admin') OR user_has_role('receptionist') OR user_has_role('cashier'));

-- ---------- Medicine, MedicineCategory, Supplier ----------
DROP POLICY IF EXISTS "Medicine read all" ON "Medicine";
DROP POLICY IF EXISTS "Medicine write pharmacy roles" ON "Medicine";

CREATE POLICY "Medicine read all" ON "Medicine"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Medicine write pharmacy roles" ON "Medicine"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'))
  WITH CHECK (user_has_role('admin') OR user_has_role('pharmacist'));

DROP POLICY IF EXISTS "MedicineCategory read all" ON "MedicineCategory";
CREATE POLICY "MedicineCategory read all" ON "MedicineCategory" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "MedicineCategory write pharmacy" ON "MedicineCategory";
CREATE POLICY "MedicineCategory write pharmacy" ON "MedicineCategory"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'));

DROP POLICY IF EXISTS "Supplier read all" ON "Supplier";
CREATE POLICY "Supplier read all" ON "Supplier" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Supplier write pharmacy" ON "Supplier";
CREATE POLICY "Supplier write pharmacy" ON "Supplier"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'));

-- ---------- Purchase, PurchaseItem, StockMovement ----------
DROP POLICY IF EXISTS "Purchase read all" ON "Purchase";
CREATE POLICY "Purchase read all" ON "Purchase" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Purchase write pharmacy" ON "Purchase";
CREATE POLICY "Purchase write pharmacy" ON "Purchase"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'));

DROP POLICY IF EXISTS "PurchaseItem read all" ON "PurchaseItem";
CREATE POLICY "PurchaseItem read all" ON "PurchaseItem" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "PurchaseItem write pharmacy" ON "PurchaseItem";
CREATE POLICY "PurchaseItem write pharmacy" ON "PurchaseItem"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'));

DROP POLICY IF EXISTS "StockMovement read all" ON "StockMovement";
CREATE POLICY "StockMovement read all" ON "StockMovement" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "StockMovement write pharmacy" ON "StockMovement";
CREATE POLICY "StockMovement write pharmacy" ON "StockMovement"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'));

-- ---------- Sale, SaleItem ----------
DROP POLICY IF EXISTS "Sale read all" ON "Sale";
CREATE POLICY "Sale read all" ON "Sale" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Sale write pharmacy" ON "Sale";
CREATE POLICY "Sale write pharmacy" ON "Sale"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'));

DROP POLICY IF EXISTS "SaleItem read all" ON "SaleItem";
CREATE POLICY "SaleItem read all" ON "SaleItem" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "SaleItem write pharmacy" ON "SaleItem";
CREATE POLICY "SaleItem write pharmacy" ON "SaleItem"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('pharmacist'));

-- ---------- Lab tables ----------
DROP POLICY IF EXISTS "LabTest read all" ON "LabTest";
CREATE POLICY "LabTest read all" ON "LabTest" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "LabTest write lab roles" ON "LabTest";
CREATE POLICY "LabTest write lab roles" ON "LabTest"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('lab'));

DROP POLICY IF EXISTS "LabCategory read all" ON "LabCategory";
CREATE POLICY "LabCategory read all" ON "LabCategory" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "LabCategory write lab roles" ON "LabCategory";
CREATE POLICY "LabCategory write lab roles" ON "LabCategory"
  FOR ALL TO authenticated
  USING (user_has_role('admin') OR user_has_role('lab'));

DROP POLICY IF EXISTS "LabOrder read all" ON "LabOrder";
CREATE POLICY "LabOrder read all" ON "LabOrder" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "LabOrder write allowed" ON "LabOrder";
CREATE POLICY "LabOrder write allowed" ON "LabOrder"
  FOR ALL
  TO authenticated
  USING (
    user_has_role('admin') OR 
    user_has_role('lab') OR 
    (user_has_role('doctor') AND 
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  )
  WITH CHECK (
    user_has_role('admin') OR 
    user_has_role('lab') OR 
    (user_has_role('doctor') AND 
      EXISTS (SELECT 1 FROM "Doctor" d WHERE d."userId" = auth.uid() AND d.id = "doctorId"))
  );

DROP POLICY IF EXISTS "LabOrderItem read all" ON "LabOrderItem";
CREATE POLICY "LabOrderItem read all" ON "LabOrderItem" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "LabOrderItem write allowed" ON "LabOrderItem";
-- LabOrderItem write: Doctor inserts LabOrderItems only via createLabOrder() which already
-- enforces doctor-ownership at the app layer on the parent LabOrder. At DB level, bare
-- 'doctor' without an ownership sub-select would allow any doctor to write any LabOrderItem.
-- Removing bare 'doctor' here; doctors pass through the 'lab' action path's createLabOrder.
CREATE POLICY "LabOrderItem write allowed" ON "LabOrderItem"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin') OR user_has_role('lab'))
  WITH CHECK (user_has_role('admin') OR user_has_role('lab'));

DROP POLICY IF EXISTS "Sample read all" ON "Sample";
CREATE POLICY "Sample read all" ON "Sample" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Sample write lab roles" ON "Sample";
CREATE POLICY "Sample write lab roles" ON "Sample"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin') OR user_has_role('lab'))
  WITH CHECK (user_has_role('admin') OR user_has_role('lab'));

DROP POLICY IF EXISTS "LabResult read all" ON "LabResult";
CREATE POLICY "LabResult read all" ON "LabResult" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "LabResult write lab roles" ON "LabResult";
CREATE POLICY "LabResult write lab roles" ON "LabResult"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin') OR user_has_role('lab'))
  WITH CHECK (user_has_role('admin') OR user_has_role('lab'));

DROP POLICY IF EXISTS "ReferenceRange read all" ON "ReferenceRange";
CREATE POLICY "ReferenceRange read all" ON "ReferenceRange" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ReferenceRange write lab roles" ON "ReferenceRange";
CREATE POLICY "ReferenceRange write lab roles" ON "ReferenceRange"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin') OR user_has_role('lab'))
  WITH CHECK (user_has_role('admin') OR user_has_role('lab'));

-- ---------- Branch ----------
DROP POLICY IF EXISTS "Branch read all" ON "Branch";
CREATE POLICY "Branch read all" ON "Branch" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Branch write admin only" ON "Branch";
CREATE POLICY "Branch write admin only" ON "Branch"
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));
