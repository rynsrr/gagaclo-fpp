-- Abort without modifying user data if duplicate numbers already exist.
-- Resolve duplicates before rerunning this migration.
CREATE UNIQUE INDEX IF NOT EXISTS purchase_requisitions_nomor_unique
ON public.purchase_requisitions (upper(btrim(nomor)));
