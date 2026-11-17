-- Disable RLS temporarily or add an explicit public insert policy for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert payments" ON payments;
DROP POLICY IF EXISTS "Allow public select payments" ON payments;
DROP POLICY IF EXISTS "Allow public update payments" ON payments;

CREATE POLICY "Allow public insert payments" ON payments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select payments" ON payments FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update payments" ON payments FOR UPDATE TO public USING (true) WITH CHECK (true);