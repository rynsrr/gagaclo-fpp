'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseRequisition, DEFAULT_PURCHASE_REQUISITION } from '@/types/purchase';
import {
  getAllPurchases,
  checkSupabasePurchaseTable,
  generateNextNomor,
  savePurchase,
  todayInJakarta,
  deletePurchase,
} from '@/lib/purchaseService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Components
import PurchaseDocument from '@/components/purchase/PurchaseDocument';
import PurchaseList from '@/components/purchase/PurchaseList';
import PurchaseSummary from '@/components/purchase/PurchaseSummary';
import PasswordModal from '@/components/purchase/PasswordModal';

// Icons
import {
  Printer,
  Plus,
  Database,
  Save,
  Sun,
  Moon,
  Lock,
  Unlock,
} from 'lucide-react';

type ActiveTab = 'FORM';

function createBlankPurchase(purchases: PurchaseRequisition[]): PurchaseRequisition {
  const now = new Date();
  return {
    ...DEFAULT_PURCHASE_REQUISITION,
    id: 'fpp-' + crypto.randomUUID(),
    nomor: generateNextNomor(purchases),
    tanggal: todayInJakarta(now),
    items: DEFAULT_PURCHASE_REQUISITION.items.map((item) => ({ ...item })),
    photos: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export default function MainPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('FORM');
  const [purchases, setPurchases] = useState<PurchaseRequisition[]>([]);
  // Hitung penggunaan kuota database Supabase (Batas Free Tier: 500 MB)
  const quotaUsageText = React.useMemo(() => {
    try {
      const bytes = new Blob([JSON.stringify(purchases)]).size;
      const mb = bytes / (1024 * 1024);
      if (mb < 0.01) {
        const kb = Math.max(1, Math.round(bytes / 1024));
        return `${kb} KB / 500 MB`;
      }
      return `${mb.toFixed(2)} MB / 500 MB`;
    } catch {
      return `${purchases.length} FPP / 500 MB`;
    }
  }, [purchases]);
  const [currentPurchase, setCurrentPurchase] = useState<PurchaseRequisition>(() => createBlankPurchase([]));
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isTableReady, setIsTableReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Sync edit mode from sessionStorage on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem('fpp_edit_unlocked') === 'true') {
        setIsEditUnlocked(true);
      }
    } catch {}
  }, []);

  const requestEditAccess = (onSuccessAction?: () => void) => {
    if (isEditUnlocked) {
      if (onSuccessAction) onSuccessAction();
      return true;
    }
    setPendingAction(() => onSuccessAction || null);
    setIsPasswordModalOpen(true);
    return false;
  };

  const handleLockEditMode = () => {
    void fetch('/api/edit-session', { method: 'DELETE' });
    setIsEditUnlocked(false);
    try {
      sessionStorage.removeItem('fpp_edit_unlocked');
    } catch {}
    setSaveNotice('Mode edit dikunci. Dokumen kembali ke Mode Hanya Baca.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handlePasswordSuccess = () => {
    setIsEditUnlocked(true);
    setSaveNotice('Mode edit berhasil dibuka!');
    setTimeout(() => setSaveNotice(null), 3000);
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

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
  const loadData = async (initialize = false) => {
    setIsLoading(true);
    const configured = isSupabaseConfigured();
    setIsCloudReady(configured);

    if (configured) {
      const tableExists = await checkSupabasePurchaseTable();
      setIsTableReady(tableExists);
    }

    const { data } = await getAllPurchases();
    const savedPurchases = data || [];
    setPurchases(savedPurchases);
    if (initialize) setCurrentPurchase(createBlankPurchase(savedPurchases));

    setIsLoading(false);
  };

  useEffect(() => {
    loadData(true);

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
  const confirmDiscard = () => {
    const saved = purchases.find((purchase) => purchase.id === currentPurchase.id);
    const baseline = saved || { ...DEFAULT_PURCHASE_REQUISITION, nomor: currentPurchase.nomor, tanggal: currentPurchase.tanggal };
    const fields = ['jenis', 'items', 'uraianKeperluan', 'catatan', 'photos', 'dimintaOleh', 'tanggalDiterima'] as const;
    const dirty = fields.some((field) => JSON.stringify(currentPurchase[field]) !== JSON.stringify(baseline[field]));
    return !dirty || confirm('Ada perubahan belum disimpan. Tinggalkan perubahan ini?');
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const saved = purchases.find((purchase) => purchase.id === currentPurchase.id);
      const baseline = saved || DEFAULT_PURCHASE_REQUISITION;
      const fields = ['jenis', 'items', 'uraianKeperluan', 'catatan', 'photos', 'dimintaOleh', 'tanggalDiterima'] as const;
      if (fields.some((field) => JSON.stringify(currentPurchase[field]) !== JSON.stringify(baseline[field]))) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPurchase, purchases]);

  const handleAddNewFPP = () => {
    if (!isEditUnlocked) {
      requestEditAccess(() => {
        setCurrentPurchase(createBlankPurchase(purchases));
        setActiveTab('FORM');
        setSaveNotice('Formulir baru berhasil dibuat. Silakan ketik langsung pada formulir.');
        setTimeout(() => setSaveNotice(null), 3500);
      });
      return;
    }
    if (!confirmDiscard()) return;
    setCurrentPurchase(createBlankPurchase(purchases));
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
    if (!isEditUnlocked) {
      requestEditAccess(() => {
        handleSavePurchase();
      });
      return;
    }
    if (!currentPurchase.nomor || !currentPurchase.nomor.trim()) {
      alert('Nomor formulir tidak boleh kosong.');
      return;
    }

    if (!currentPurchase.jenis) {
      alert('Pilih jenis formulir: Rutin, Non Rutin, atau Segera.');
      return;
    }

    if (isSaving) return;
    if (purchases.some((purchase) => purchase.id !== currentPurchase.id && purchase.nomor.trim().toUpperCase() === currentPurchase.nomor.trim().toUpperCase())) {
      alert('Nomor FPP sudah digunakan. Generate nomor baru sebelum menyimpan.');
      return;
    }
    setIsSaving(true);
    setSaveNotice(null);

    const result = await savePurchase(currentPurchase);
    setIsSaving(false);

    if (result.success) {
      const destination = result.fromCloud
        ? (result.localSaved ? 'Supabase Cloud Database & Penyimpanan Lokal' : 'Supabase Cloud Database')
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
    if (!isEditUnlocked) {
      requestEditAccess(() => {
        setCurrentPurchase(item);
        setActiveTab('FORM');
      });
      return;
    }
    if (!confirmDiscard()) return;
    setCurrentPurchase(item);
    setActiveTab('FORM');
  };

  const handleDeletePurchase = (id: string, nomor: string) => {
    if (!isEditUnlocked) {
      requestEditAccess(async () => {
        if (confirm(`Apakah Anda yakin ingin menghapus formulir ${nomor}?`)) {
          const res = await deletePurchase(id);
          if (!res.success) {
            alert('Penghapusan gagal. Data belum terhapus dari database.');
            return;
          }
          loadData();
        }
      });
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus formulir ${nomor}?`)) {
      deletePurchase(id).then((res) => {
        if (!res.success) {
          alert('Penghapusan gagal. Data belum terhapus dari database.');
          return;
        }
        loadData();
      });
    }
  };

  const handleSelectForPreview = (item: PurchaseRequisition) => {
    if (!confirmDiscard()) return;
    setCurrentPurchase(item);
    setActiveTab('FORM');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#08090C] text-slate-900 dark:text-[#F5F5F7] flex flex-col transition-colors duration-200">
      {/* Top Navigation Bar (Hidden during print) */}
      <header className="no-print sticky top-0 z-40 bg-white/90 dark:bg-[#08090C]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Company Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <span className="text-[28px] sm:text-[32px] leading-none font-bold tracking-tight text-black dark:text-white">FPP</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-zinc-800" />
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm sm:text-base font-semibold uppercase tracking-wide text-slate-700 dark:text-zinc-200">
                FORMULIR PERMOHONAN PEMBELIAN
              </span>
            </div>
          </div>

          {/* Right Status & Fast Action */}
          <div className="flex items-center space-x-2">
            {/* Mode Edit Lock / Unlock Button */}
            {!isEditUnlocked ? (
              <button
                type="button"
                onClick={() => requestEditAccess()}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-sm"
                title="Dokumen dalam Mode Hanya Baca. Klik untuk membuka Mode Edit"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Hanya Baca</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Mode Edit</span>
                <button
                  type="button"
                  onClick={handleLockEditMode}
                  className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 transition"
                  title="Kunci kembali dokumen"
                >
                  Kunci
                </button>
              </div>
            )}
<div className="no-print flex items-center gap-2" role="group" aria-label="Aksi formulir">
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleAddNewFPP}
                    className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
                    aria-label="Formulir baru"
                    title="Buat formulir baru dengan nomor urut berikutnya"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
                  aria-label="Cetak / PDF"
                  title="Cetak langsung atau simpan sebagai PDF A4 (Pasti 1 Halaman)"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={handleSavePurchase}
                    disabled={isSaving || isLoading}
                    className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
                    aria-label={isSaving ? 'Menyimpan...' : 'Simpan FPP'}
                    aria-busy={isSaving}
                    title="Simpan formulir ke database Supabase dan penyimpanan lokal"
                  >
                    <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                  </button>
              </div>
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
              title={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Icon Penggunaan Kuota (Indikator Murni tanpa aksi klik) */}
            <div
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm cursor-default select-none"
              title={`Penggunaan Kuota Database: ${quotaUsageText} (${purchases.length} FPP tersimpan)`}
              aria-label={`Kuota database ${quotaUsageText}`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-slate-700 dark:text-zinc-300 font-mono text-[11px] sm:text-xs">
                {quotaUsageText}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isTableReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>

          </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto flex flex-col items-center">
        {/* Render Direct Interactive Form Document */}
        {activeTab === 'FORM' && (
          <div className="w-full grid grid-cols-1 xl:grid-cols-[minmax(0,210mm)_minmax(0,1fr)] gap-6 items-start print:block">
          <div className="w-full max-w-[210mm] mx-auto space-y-3">
          {!isEditUnlocked && (
            <div className="no-print w-full flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Dokumen dalam <strong>Mode Hanya Baca</strong>. Masukkan password untuk mengedit.</span>
              </div>
              <button
                type="button"
                onClick={() => requestEditAccess()}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-xs transition active:scale-95 shadow-sm"
              >
                Buka Kunci Edit
              </button>
            </div>
          )}
          {isEditUnlocked && (
            <div className="no-print w-full flex items-center justify-between px-4 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center space-x-2">
                <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong>Mode Edit Aktif</strong> — Anda dapat mengubah isi formulir dan menyimpan ke database.</span>
              </div>
              <button
                type="button"
                onClick={handleLockEditMode}
                className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs transition"
              >
                Kunci Dokumen
              </button>
            </div>
          )}
          <PurchaseDocument
            key={currentPurchase.id || 'current-fpp'}
            data={currentPurchase}
            onChange={setCurrentPurchase}
            onSave={handleSavePurchase}
            onGenerateNomor={handleGenerateNomor}
            saveNotice={saveNotice}
            isEditable={isEditUnlocked && !isLoading}
          />
          </div>
          <div className="no-print min-w-0 space-y-4">
          <PurchaseSummary purchases={purchases} />
            <PurchaseList
              purchases={purchases}
              onSelectForEdit={handleSelectForEdit}
              onSelectForPreview={handleSelectForPreview}
              onAddNew={handleAddNewFPP}
              onDelete={handleDeletePurchase}
              onRefresh={() => loadData()}
            />
          </div>
          </div>
        )}

      </main>



      {/* Password Modal for Edit Access */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}
