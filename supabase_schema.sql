-- ========================================================
-- SUPABASE SCHEMA FOR PT GAGACLO SYSTEM
-- Formulir Permohonan Pembelian (FPP) & PPIC Issue Tracker
-- Run this in your Supabase SQL Editor: https://app.supabase.com -> SQL Editor
-- ========================================================

-- 1. Table for Purchase Requisitions (Formulir Permohonan Pembelian)
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id TEXT PRIMARY KEY,
  nomor TEXT NOT NULL,
  tanggal DATE NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('Rutin', 'Non Rutin', 'Segera')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  uraian_keperluan TEXT,
  tanggal_diterima DATE,
  catatan TEXT,
  diminta_oleh TEXT,
  diminta_tanggal DATE,
  diketahui_oleh TEXT,
  diketahui_tanggal DATE,
  disetujui_oleh TEXT,
  disetujui_tanggal DATE,
  diterima_oleh TEXT,
  diterima_tanggal DATE,
  status TEXT NOT NULL DEFAULT 'Diajukan',
  total_taksiran NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast search & sorting
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_nomor ON public.purchase_requisitions(nomor);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_tanggal ON public.purchase_requisitions(tanggal);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_jenis ON public.purchase_requisitions(jenis);

-- RLS for purchase_requisitions
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_requisitions' 
    AND policyname = 'Allow public full access to purchase_requisitions'
  ) THEN
    CREATE POLICY "Allow public full access to purchase_requisitions" 
    ON public.purchase_requisitions FOR ALL 
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Table for PPIC Issues (Retained for Issue Tracker integration)
CREATE TABLE IF NOT EXISTS public.issues (
  id TEXT PRIMARY KEY,
  ppic TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BELUM_SELESAI',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ppic_names (
  id TEXT PRIMARY KEY,
  custom_name TEXT NOT NULL
);

INSERT INTO public.ppic_names (id, custom_name) VALUES
  ('PPIC 1', 'PPIC 1 (Royan)'),
  ('PPIC 2', 'PPIC 2 (Cynara)'),
  ('PPIC 3', 'PPIC 3 (Ami)'),
  ('PPIC 4', 'PPIC 4 (Ryan)'),
  ('PPIC 5', 'PPIC 5 (Hanamy)')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'issues' 
    AND policyname = 'Allow public full access to issues'
  ) THEN
    CREATE POLICY "Allow public full access to issues" 
    ON public.issues FOR ALL 
    USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.ppic_names ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ppic_names' 
    AND policyname = 'Allow public full access to ppic_names'
  ) THEN
    CREATE POLICY "Allow public full access to ppic_names" 
    ON public.ppic_names FOR ALL 
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Enable Realtime broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ppic_names;
