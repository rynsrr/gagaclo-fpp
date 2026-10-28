'use client';

import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  X,
  Server,
} from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTableReady: boolean;
  supabaseUrl: string;
}

const SQL_SCHEMA = `-- Jalankan skrip ini di Supabase SQL Editor:
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

-- Index
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_nomor ON public.purchase_requisitions(nomor);

-- Policy Akses Penuh
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access to purchase_requisitions" 
ON public.purchase_requisitions FOR ALL 
USING (true) WITH CHECK (true);

-- Realtime Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_requisitions;`;

export default function SupabaseSetupModal({
  isOpen,
  onClose,
  isTableReady,
  supabaseUrl,
}: SupabaseSetupModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Status Database Supabase</h3>
              <p className="text-xs text-zinc-400">Sinkronisasi Cloud Formulir Permohonan Pembelian</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
            <div className="text-[11px] text-zinc-400 font-medium">Koneksi Supabase:</div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="truncate">{supabaseUrl ? 'Tersambung ke Cloud' : 'Tidak Dikonfigurasi'}</span>
            </div>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
            <div className="text-[11px] text-zinc-400 font-medium">Tabel purchase_requisitions:</div>
            <div className="flex items-center space-x-2 text-xs font-semibold">
              {isTableReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Tabel Aktif di Cloud</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">Belum Dibuat (Pakai Local Fallback)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step by step guide */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Langkah Mengaktifkan Database Supabase:
          </div>
          <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-1.5 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <li>
              Buka project Anda di{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline inline-flex items-center space-x-1"
              >
                <span>Dashboard Supabase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Klik menu <strong>SQL Editor</strong> di bilah navigasi kiri.</li>
            <li>Klik tombol <strong>New query</strong>.</li>
            <li>Salin skrip SQL di bawah ini dan klik <strong>Run</strong> (atau Ctrl+Enter).</li>
            <li>Muat ulang halaman ini. Data formulir Anda kini aman tersimpan di cloud!</li>
          </ol>
        </div>

        {/* SQL Code Block with Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Skrip SQL Supabase:</span>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 rounded-lg border border-zinc-700 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Skrip SQL</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-48">
            <pre>{SQL_SCHEMA}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
