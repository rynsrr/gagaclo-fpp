'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseRequisition, DEFAULT_PURCHASE_REQUISITION } from '@/types/purchase';
import {
  getAllPurchases,
  checkSupabasePurchaseTable,
  generateNextNomor,
  savePurchase,
  SAMPLE_PURCHASE_REQUISITION,
} from '@/lib/purchaseService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { LOGO_GAGACLO_SRC } from '@/lib/logoData';

// Components
import PurchaseDocument from '@/components/purchase/PurchaseDocument';
import PurchaseList from '@/components/purchase/PurchaseList';
import SupabaseSetupModal from '@/components/purchase/SupabaseSetupModal';

// Icons
import {
  FileText,
  ListFilter,
  Printer,
  Plus,
  Database,
  Save,
  Sun,
  Moon,
} from 'lucide-react';

type ActiveTab = 'FORM' | 'LIST';

export default function MainPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('FORM');
  const [purchases, setPurchases] = useState<PurchaseRequisition[]>([]);
  const [currentPurchase, setCurrentPurchase] = useState<PurchaseRequisition>(SAMPLE_PURCHASE_REQUISITION);
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isTableReady, setIsTableReady] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Theme Sync on Mount
  useEffect(() => {
    try {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('gagaclo_theme', nextTheme);
    } catch {}
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load data & verify Supabase
  const loadData = async () => {
    setIsLoading(true);
    const configured = isSupabaseConfigured();
    setIsCloudReady(configured);

    if (configured) {
      const tableExists = await checkSupabasePurchaseTable();
      setIsTableReady(tableExists);
    }

    const { data } = await getAllPurchases();
    if (data && data.length > 0) {
      setPurchases(data);
      setCurrentPurchase(data[0]);
    } else {
      setPurchases([SAMPLE_PURCHASE_REQUISITION]);
      setCurrentPurchase(SAMPLE_PURCHASE_REQUISITION);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime channel for live multi-user sync
    if (isSupabaseConfigured() && supabase) {
      const channel = supabase
        .channel('realtime:purchases')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'purchase_requisitions' },
          () => {
            getAllPurchases().then(({ data }) => {
              if (data) setPurchases(data);
            });
          }
        )
        .subscribe();

      return () => {
        if (supabase) supabase.removeChannel(channel);
      };
    }
  }, []);

  // Handlers
  const handleAddNewFPP = () => {
    const nextNomor = generateNextNomor(purchases);
    const newDoc: PurchaseRequisition = {
      ...DEFAULT_PURCHASE_REQUISITION,
      id: 'fpp-' + Date.now(),
      nomor: nextNomor,
      tanggal: new Date().toISOString().split('T')[0],
      tanggalDiterima: '',
      photos: [],
      dimintaTanggal: '',
      dimintaOleh: 'ROYAN - RDI',
      items: [
        {
          id: 'item-1',
          no: 1,
          namaBarang: '',
          banyaknya: '',
          hargaSatuan: 0,
          jumlah: 0,
          supplier: '',
        },
      ],
    };
    setCurrentPurchase(newDoc);
    setActiveTab('FORM');
    setSaveNotice('Formulir baru berhasil dibuat. Silakan ketik langsung pada formulir.');
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleGenerateNomor = () => {
    const nextNomor = generateNextNomor(purchases);
    setCurrentPurchase((prev) => ({
      ...prev,
      nomor: nextNomor,
    }));
  };

  const handleSavePurchase = async () => {
    if (!currentPurchase.nomor || !currentPurchase.nomor.trim()) {
      alert('Nomor formulir tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setSaveNotice(null);

    const result = await savePurchase(currentPurchase);
    setIsSaving(false);

    if (result.success) {
      const destination = result.fromCloud
        ? 'Supabase Cloud Database & Penyimpanan Lokal'
        : 'Penyimpanan Lokal (Browser Storage)';
      setSaveNotice(`Formulir ${currentPurchase.nomor} berhasil disimpan ke ${destination}!`);
      
      // Update local state without losing focus
      const updatedList = purchases.some((p) => p.id === currentPurchase.id)
        ? purchases.map((p) => (p.id === currentPurchase.id ? currentPurchase : p))
        : [currentPurchase, ...purchases];
      setPurchases(updatedList);

      setTimeout(() => setSaveNotice(null), 4000);
    } else {
      alert('Gagal menyimpan formulir.');
    }
  };

  const handleSelectForEdit = (item: PurchaseRequisition) => {
    setCurrentPurchase(item);
    setActiveTab('FORM');
  };

  const handleSelectForPreview = (item: PurchaseRequisition) => {
    setCurrentPurchase(item);
    setActiveTab('FORM');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#08090C] text-slate-900 dark:text-[#F5F5F7] flex flex-col transition-colors duration-200">
      {/* Top Navigation Bar (Hidden during print) */}
      <header className="no-print sticky top-0 z-40 bg-white/90 dark:bg-[#08090C]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Company Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <img
                src={LOGO_GAGACLO_SRC}
                alt="P.T. GAGACLO"
                className="h-7 sm:h-8 w-auto object-contain dark:brightness-0 dark:invert transition-all"
              />
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-zinc-800" />
            <div className="hidden sm:flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-md border border-slate-300 dark:border-zinc-700">
                FPP System
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Formulir Permohonan Pembelian
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-200/80 dark:bg-zinc-900/90 border border-slate-300 dark:border-zinc-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('FORM')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'FORM'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Formulir FPP (Input Langsung)</span>
            </button>

            <button
              onClick={() => setActiveTab('LIST')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'LIST'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Daftar FPP ({purchases.length})</span>
            </button>
          </nav>

          {/* Right Status & Fast Action */}
          <div className="flex items-center space-x-2">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
              title={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Supabase Status Pill */}
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-sm"
              title="Klik untuk konfigurasi dan status database Supabase"
            >
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline text-slate-700 dark:text-zinc-300">
                {isTableReady ? 'Supabase Cloud' : 'Supabase (Setup)'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isTableReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>

          </div>
        </div>
        {activeTab === 'FORM' && (
          <div className="max-w-7xl mx-auto mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-800/90 to-slate-900/90 dark:from-zinc-900 dark:to-zinc-950 border border-slate-600/40 dark:border-zinc-700/60 rounded-xl p-3 px-4 text-white backdrop-blur-sm">
            {/* Right: Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Secondary actions group */}
              <div className="flex items-center gap-1.5 bg-white/5 dark:bg-white/[0.03] rounded-xl p-1 border border-white/10 dark:border-white/[0.06]">

                <button
                    type="button"
                    onClick={handleAddNewFPP}
                    className="inline-flex items-center justify-center w-9 h-9 text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-medium rounded-lg transition"
                    aria-label="Formulir baru"
                    title="Buat formulir baru dengan nomor urut berikutnya"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-white/10 dark:bg-white/10" />

              {/* Primary actions group */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-900/30 transition active:scale-95 hover:shadow-md hover:shadow-indigo-900/40"
                  aria-label="Cetak / PDF"
                  title="Cetak langsung atau simpan sebagai PDF A4 (Pasti 1 Halaman)"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={handleSavePurchase}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm shadow-emerald-900/30 transition active:scale-95 disabled:opacity-50 hover:shadow-md hover:shadow-emerald-900/40"
                    aria-label={isSaving ? 'Menyimpan...' : 'Simpan FPP'}
                    aria-busy={isSaving}
                    title="Simpan formulir ke database Supabase dan penyimpanan lokal"
                  >
                    <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                  </button>
              </div>
            </div>
          </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto flex flex-col items-center">
        {/* Render Direct Interactive Form Document */}
        {activeTab === 'FORM' && (
          <PurchaseDocument
            key={currentPurchase.id || 'current-fpp'}
            data={currentPurchase}
            onChange={setCurrentPurchase}
            onSave={handleSavePurchase}
            onGenerateNomor={handleGenerateNomor}
            saveNotice={saveNotice}
            isEditable={true}
          />
        )}

        {/* Render List */}
        {activeTab === 'LIST' && (
          <div className="w-full">
            <PurchaseList
              purchases={purchases}
              onSelectForEdit={handleSelectForEdit}
              onSelectForPreview={handleSelectForPreview}
              onAddNew={handleAddNewFPP}
              onRefresh={loadData}
            />
          </div>
        )}
      </main>

      {/* Footer (Hidden during print) */}
      <footer className="no-print border-t border-slate-200 dark:border-white/5 py-4 px-6 text-center text-xs text-slate-500 dark:text-zinc-600 mt-auto">
        <span>PT Gagaclo &bull; Aplikasi Formulir Permohonan Pembelian Standar Pabrik (Input Langsung di Formulir)</span>
      </footer>

      {/* Supabase Setup Modal */}
      <SupabaseSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        isTableReady={isTableReady}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
      />
    </div>
  );
}
