CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
id text PRIMARY KEY, nomor text NOT NULL, tanggal date NOT NULL,
jenis text NOT NULL CHECK (jenis IN ('Rutin','Non Rutin','Segera')),
items jsonb NOT NULL DEFAULT '[]', photos jsonb NOT NULL DEFAULT '[]',
uraian_keperluan text, tanggal_diterima date, catatan text,
diminta_oleh text, diminta_tanggal date, diketahui_oleh text, diketahui_tanggal date,
disetujui_oleh text, disetujui_tanggal date, diterima_oleh text, diterima_tanggal date,
status text NOT NULL DEFAULT 'Draft', total_taksiran numeric DEFAULT 0,
created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS purchase_requisitions_nomor_unique ON public.purchase_requisitions (upper(btrim(nomor)));
CREATE TABLE IF NOT EXISTS public.fpp_allowed_emails (email text PRIMARY KEY);
ALTER TABLE public.fpp_allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own FPP membership" ON public.fpp_allowed_emails FOR SELECT TO authenticated USING (email = lower(auth.jwt()->>'email'));
CREATE POLICY "Corporate FPP members only" ON public.purchase_requisitions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.fpp_allowed_emails WHERE email = lower(auth.jwt()->>'email'))) WITH CHECK (EXISTS (SELECT 1 FROM public.fpp_allowed_emails WHERE email = lower(auth.jwt()->>'email')));
GRANT SELECT ON public.fpp_allowed_emails TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requisitions TO authenticated;
NOTIFY pgrst, 'reload schema';
