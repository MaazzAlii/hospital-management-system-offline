-- Enable RLS on core tables
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Doctor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

-- Note: In a typical setup where Prisma connects via the superuser "postgres", 
-- RLS policies are bypassed automatically. These policies ensure that if you ever 
-- connect using the "anon" or "authenticated" Supabase API roles, the data is secured.

-- Patient Policies
-- Allow all authenticated users to read patients
CREATE POLICY "Allow authenticated read on Patient"
ON "Patient" FOR SELECT
TO authenticated
USING (true);

-- Only allow insert/update from authenticated users
CREATE POLICY "Allow authenticated insert on Patient"
ON "Patient" FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on Patient"
ON "Patient" FOR UPDATE
TO authenticated
USING (true);

-- Doctor Policies
CREATE POLICY "Allow authenticated read on Doctor"
ON "Doctor" FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert/update on Doctor"
ON "Doctor" FOR ALL
TO authenticated
USING (true);

-- Appointment Policies
CREATE POLICY "Allow authenticated read on Appointment"
ON "Appointment" FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert/update on Appointment"
ON "Appointment" FOR ALL
TO authenticated
USING (true);
