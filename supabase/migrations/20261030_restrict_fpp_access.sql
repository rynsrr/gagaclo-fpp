-- Apply only after Supabase Auth sign-in and authorized users are configured.
-- No users can access FPP data until added to this allowlist by an administrator.
BEGIN;
CREATE TABLE IF NOT EXISTS public.fpp_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.fpp_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own FPP membership" ON public.fpp_members;
CREATE POLICY "Read own FPP membership" ON public.fpp_members
FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.fpp_members TO authenticated;
DROP POLICY IF EXISTS "Allow public full access to purchase_requisitions" ON public.purchase_requisitions;
DROP POLICY IF EXISTS "FPP members only" ON public.purchase_requisitions;
CREATE POLICY "FPP members only" ON public.purchase_requisitions
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.fpp_members WHERE user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.fpp_members WHERE user_id = auth.uid()));
COMMIT;
