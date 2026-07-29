-- =============================================================================
-- COMPREHENSIVE SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- Defense-in-depth RLS configuration for Life Care Clinic HMS.
-- Primary authorization is enforced in Next.js Server Actions.
-- These RLS policies ensure strict DB-level security for all direct Supabase calls.

-- -----------------------------------------------------------------------------
-- 1. ENABLE RLS ON ALL CORE TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
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

-- Helper Function: Check if authenticated user has a specific role
CREATE OR REPLACE FUNCTION public.get_user_role_name()
RETURNS text AS $$
  SELECT r.name
  FROM "User" u
  JOIN "Role" r ON u."roleId" = r.id
  WHERE u.email = auth.jwt() ->> 'email'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper Function: Check if user is Super Admin or Hospital Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User" u
    JOIN "Role" r ON u."roleId" = r.id
    WHERE u.email = auth.jwt() ->> 'email'
      AND LOWER(r.name) IN ('super admin', 'superadmin', 'hospital admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2. PATIENT POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read on Patient" ON "Patient";
DROP POLICY IF EXISTS "Allow authenticated insert on Patient" ON "Patient";
DROP POLICY IF EXISTS "Allow authenticated update on Patient" ON "Patient";
DROP POLICY IF EXISTS "Allow authorized write on Patient" ON "Patient";

CREATE POLICY "Allow authenticated read on Patient"
  ON "Patient" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authorized write on Patient"
  ON "Patient" FOR ALL
  TO authenticated
  USING (
    public.is_admin() OR public.get_user_role_name() IN ('Receptionist', 'Doctor', 'Cashier')
  );

-- -----------------------------------------------------------------------------
-- 3. DOCTOR POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read on Doctor" ON "Doctor";
DROP POLICY IF EXISTS "Allow authenticated insert/update on Doctor" ON "Doctor";
DROP POLICY IF EXISTS "Allow admin write on Doctor" ON "Doctor";

CREATE POLICY "Allow authenticated read on Doctor"
  ON "Doctor" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin write on Doctor"
  ON "Doctor" FOR ALL
  TO authenticated
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. APPOINTMENT POLICIES (With Doctor Row-Level Filtering)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read on Appointment" ON "Appointment";
DROP POLICY IF EXISTS "Allow authenticated insert/update on Appointment" ON "Appointment";
DROP POLICY IF EXISTS "Allow authorized write on Appointment" ON "Appointment";

CREATE POLICY "Allow authenticated read on Appointment"
  ON "Appointment" FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.get_user_role_name() IN ('Receptionist', 'Cashier') OR (
      public.get_user_role_name() = 'Doctor' AND EXISTS (
        SELECT 1 FROM "Doctor" d
        JOIN "User" u ON d."userId" = u.id
        WHERE u.email = auth.jwt() ->> 'email'
          AND d.id = "Appointment"."doctorId"
      )
    )
  );

CREATE POLICY "Allow authorized write on Appointment"
  ON "Appointment" FOR ALL
  TO authenticated
  USING (
    public.is_admin() OR public.get_user_role_name() IN ('Receptionist') OR (
      public.get_user_role_name() = 'Doctor' AND EXISTS (
        SELECT 1 FROM "Doctor" d
        JOIN "User" u ON d."userId" = u.id
        WHERE u.email = auth.jwt() ->> 'email'
          AND d.id = "Appointment"."doctorId"
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 5. OPD VISIT POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read on OpdVisit" ON "OpdVisit";
DROP POLICY IF EXISTS "Allow authorized write on OpdVisit" ON "OpdVisit";

CREATE POLICY "Allow authenticated read on OpdVisit"
  ON "OpdVisit" FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.get_user_role_name() IN ('Receptionist', 'Cashier') OR (
      public.get_user_role_name() = 'Doctor' AND EXISTS (
        SELECT 1 FROM "Doctor" d
        JOIN "User" u ON d."userId" = u.id
        WHERE u.email = auth.jwt() ->> 'email'
          AND d.id = "OpdVisit"."doctorId"
      )
    )
  );

CREATE POLICY "Allow authorized write on OpdVisit"
  ON "OpdVisit" FOR ALL
  TO authenticated
  USING (
    public.is_admin() OR (
      public.get_user_role_name() = 'Doctor' AND EXISTS (
        SELECT 1 FROM "Doctor" d
        JOIN "User" u ON d."userId" = u.id
        WHERE u.email = auth.jwt() ->> 'email'
          AND d.id = "OpdVisit"."doctorId"
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 6. BILLING & INVOICE POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authorized read on Invoice" ON "Invoice";
DROP POLICY IF EXISTS "Allow authorized write on Invoice" ON "Invoice";
DROP POLICY IF EXISTS "Allow authorized read on Payment" ON "Payment";
DROP POLICY IF EXISTS "Allow authorized write on Payment" ON "Payment";

CREATE POLICY "Allow authorized read on Invoice"
  ON "Invoice" FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.get_user_role_name() IN ('Cashier', 'Receptionist'));

CREATE POLICY "Allow authorized write on Invoice"
  ON "Invoice" FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.get_user_role_name() IN ('Cashier'));

CREATE POLICY "Allow authorized read on Payment"
  ON "Payment" FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.get_user_role_name() IN ('Cashier'));

CREATE POLICY "Allow authorized write on Payment"
  ON "Payment" FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.get_user_role_name() IN ('Cashier'));

-- -----------------------------------------------------------------------------
-- 7. USER & SYSTEM POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read on User" ON "User";
DROP POLICY IF EXISTS "Allow admin write on User" ON "User";
DROP POLICY IF EXISTS "Allow admin write on Settings" ON "Settings";
DROP POLICY IF EXISTS "Allow authenticated read on Settings" ON "Settings";
DROP POLICY IF EXISTS "Allow admin read on AuditLog" ON "AuditLog";

CREATE POLICY "Allow authenticated read on User"
  ON "User" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin write on User"
  ON "User" FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Allow admin write on Settings"
  ON "Settings" FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Allow authenticated read on Settings"
  ON "Settings" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin read on AuditLog"
  ON "AuditLog" FOR SELECT
  TO authenticated
  USING (public.is_admin());
