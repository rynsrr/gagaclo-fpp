BEGIN;
CREATE OR REPLACE FUNCTION public.fpp_access_mode() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true; $$;
GRANT EXECUTE ON FUNCTION public.fpp_access_mode() TO anon,authenticated;
CREATE TABLE IF NOT EXISTS public.fpp_access (
  email text PRIMARY KEY CHECK (email = lower(email) AND email LIKE '%@%'),
  role text NOT NULL CHECK (role IN ('admin','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fpp_access ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF to_regclass('public.fpp_allowed_emails') IS NOT NULL THEN
  INSERT INTO public.fpp_access(email,role) SELECT lower(email),'editor' FROM public.fpp_allowed_emails ON CONFLICT (email) DO NOTHING;
 END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.fpp_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.fpp_access WHERE email = lower(auth.jwt()->>'email');
$$;
REVOKE ALL ON FUNCTION public.fpp_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fpp_role() TO authenticated;
CREATE POLICY "Members read own access; admin reads all" ON public.fpp_access FOR SELECT TO authenticated USING (email = lower(auth.jwt()->>'email') OR public.fpp_role()='admin');
CREATE POLICY "Admin manages access" ON public.fpp_access FOR ALL TO authenticated USING (public.fpp_role()='admin') WITH CHECK (public.fpp_role()='admin');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fpp_access TO authenticated;
REVOKE ALL ON public.fpp_access FROM anon;
CREATE OR REPLACE FUNCTION public.fpp_keep_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(61030);
 IF OLD.role='admin' AND (TG_OP='DELETE' OR NEW.role<>'admin') AND (SELECT count(*) FROM public.fpp_access WHERE role='admin')<=1 THEN
  RAISE EXCEPTION 'Minimal satu admin harus tetap aktif.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
CREATE TRIGGER fpp_keep_admin BEFORE UPDATE OR DELETE ON public.fpp_access FOR EACH ROW EXECUTE FUNCTION public.fpp_keep_admin();
CREATE TABLE IF NOT EXISTS public.fpp_purchase_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purchase_id text NOT NULL, action text NOT NULL,
 actor_id uuid, actor_email text, changed_at timestamptz NOT NULL DEFAULT now(), before_data jsonb, after_data jsonb
);
CREATE INDEX IF NOT EXISTS fpp_history_purchase_date ON public.fpp_purchase_history(purchase_id,changed_at DESC);
ALTER TABLE public.fpp_purchase_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read history" ON public.fpp_purchase_history FOR SELECT TO authenticated USING (public.fpp_role() IN ('admin','editor','viewer'));
GRANT SELECT ON public.fpp_purchase_history TO authenticated;
REVOKE ALL ON public.fpp_purchase_history FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.fpp_purchase_history FROM authenticated;
CREATE OR REPLACE FUNCTION public.fpp_record_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP<>'DELETE' THEN NEW.updated_at=now(); END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(OLD)-'updated_at')=(to_jsonb(NEW)-'updated_at') THEN RETURN NEW; END IF;
 INSERT INTO public.fpp_purchase_history(purchase_id,action,actor_id,actor_email,before_data,after_data)
 VALUES(CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END,TG_OP,auth.uid(),auth.jwt()->>'email',
 CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
CREATE TRIGGER fpp_record_change BEFORE INSERT OR UPDATE OR DELETE ON public.purchase_requisitions FOR EACH ROW EXECUTE FUNCTION public.fpp_record_change();
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS fpp_unique_number_ci ON public.purchase_requisitions(lower(btrim(nomor)));
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='purchase_requisitions' LOOP
  EXECUTE format('DROP POLICY %I ON public.purchase_requisitions',p.policyname);
 END LOOP;
END; $$;
CREATE POLICY "Members view FPP" ON public.purchase_requisitions FOR SELECT TO authenticated USING (public.fpp_role() IN ('admin','editor','viewer'));
CREATE POLICY "Editors create FPP" ON public.purchase_requisitions FOR INSERT TO authenticated WITH CHECK (public.fpp_role() IN ('admin','editor'));
CREATE POLICY "Editors update FPP" ON public.purchase_requisitions FOR UPDATE TO authenticated USING (public.fpp_role() IN ('admin','editor')) WITH CHECK (public.fpp_role() IN ('admin','editor'));
CREATE POLICY "Admin deletes FPP" ON public.purchase_requisitions FOR DELETE TO authenticated USING (public.fpp_role()='admin');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requisitions TO authenticated;
REVOKE ALL ON public.purchase_requisitions FROM anon;
INSERT INTO public.fpp_access(email,role) VALUES ('ryanpurwabara@gmail.com','admin') ON CONFLICT (email) DO UPDATE SET role='admin';
NOTIFY pgrst, 'reload schema';
COMMIT;
