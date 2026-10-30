'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { deleteAttachment } from '@/lib/attachmentUpload';

// Components
import PurchaseDocument from '@/components/purchase/PurchaseDocument';
import PurchaseList from '@/components/purchase/PurchaseList';
import PurchaseSummary from '@/components/purchase/PurchaseSummary';
import R2Quota from '@/components/purchase/R2Quota';
import {
  blankBaseline,
  duplicatePurchase,
  fingerprint,
  getDraft,
  listDrafts,
  removeDraft,
  storeDraft,
} from '@/lib/purchaseEditing';

// Icons
import {
  Printer,
  Plus,
  Database,
  Save,
  Sun,
  Moon,
} from 'lucide-react';

type ActiveTab = 'FORM';

function createBlankPurchase(purchases: PurchaseRequisition[]): PurchaseRequisition {
  const now = new Date();
  return {
    ...DEFAULT_PURCHASE_REQUISITION,
    id: 'fpp-' + crypto.randomUUID(),
    nomor: generateNextNomor(purchases),
    tanggal: todayInJakarta(now),
    jenis: 'Rutin',
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

  const [savedFingerprint, setSavedFingerprint] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [drafts, setDrafts] = useState<ReturnType<typeof listDrafts>>([]);
  const currentRef = useRef(currentPurchase);
  currentRef.current = currentPurchase;
  const dirty = draftReady && fingerprint(currentPurchase) !== savedFingerprint;

  const openPurchase = (item: PurchaseRequisition, restore = true) => {
    const draft = restore ? getDraft(item.id) : null;
    setCurrentPurchase(draft?.purchase || item);
    setSavedFingerprint(fingerprint(item));
  };

  const handleDocumentChange = (item: PurchaseRequisition) => {
    setCurrentPurchase(item);
  };

  useEffect(() => {
    if (!draftReady || !dirty || isLoading) return;
    const timer = window.setTimeout(() => {
      try {
        storeDraft(currentPurchase);
        setDrafts(listDrafts());
      } catch {}
    }, 500);
    return () => window.clearTimeout(timer);
  }, [currentPurchase, dirty, draftReady, isLoading]);

  useEffect(() => {
    const flush = () => {
      if (draftReady && dirty) {
        try {
          storeDraft(currentRef.current);
        } catch {}
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('fpp-flush-draft', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('fpp-flush-draft', flush);
    };
  }, [draftReady, dirty]);

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
    if (initialize) {
      const draft = getDraft();
      const blank = createBlankPurchase(savedPurchases);
      setCurrentPurchase(draft?.purchase || blank);
      setSavedFingerprint(
        fingerprint(
          draft
            ? savedPurchases.find((p) => p.id === draft.purchase.id) || blankBaseline(draft.purchase)
            : blank
        )
      );
      setDrafts(listDrafts());
      setDraftReady(true);
    }

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
    if (!dirty) return true;
    try {
      storeDraft(currentPurchase);
      return true;
    } catch {
      return confirm('Draft belum dapat disimpan di perangkat. Tinggalkan perubahan ini?');
    }
  };

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      try {
        storeDraft(currentRef.current);
      } catch {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const handleAddNewFPP = () => {
    if (!confirmDiscard()) return;
    openPurchase(createBlankPurchase(purchases), false);
    setActiveTab('FORM');
    setSaveNotice('Formulir baru siap diisi.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleGenerateNomor = () => {
    const nextNomor = generateNextNomor(purchases);
    setCurrentPurchase((prev) => ({
      ...prev,
      nomor: nextNomor,
    }));
  };

  const handleSavePurchase = async () => {
    if (isSaving) return;
    const snapshot = structuredClone(currentPurchase);
    setIsSaving(true);
    setSaveNotice(null);

    const result = await savePurchase(snapshot);
    setIsSaving(false);

    if (result.success) {
      setSaveNotice(
        result.fromCloud
          ? `✓ Formulir ${snapshot.nomor} berhasil tersimpan di cloud!`
          : `✓ Formulir ${snapshot.nomor} tersimpan lokal; belum tersinkron ke cloud.`
      );
      setPurchases((previous) =>
        previous.some((p) => p.id === snapshot.id)
          ? previous.map((p) => (p.id === snapshot.id ? snapshot : p))
          : [snapshot, ...previous]
      );
      setSavedFingerprint(fingerprint(snapshot));
      try {
        removeDraft(snapshot.id);
        setDrafts(listDrafts());
      } catch {}
      setTimeout(() => setSaveNotice(null), 4000);
    } else {
      alert('Gagal menyimpan formulir.');
    }
  };

  const handleSelectForEdit = (item: PurchaseRequisition) => {
    if (!confirmDiscard()) return;
    openPurchase(item);
    setActiveTab('FORM');
  };

  const handleDeletePurchase = async (id: string, nomor: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus formulir ${nomor}?`)) {
      const toDelete = purchases.find((p) => p.id === id);
      if (toDelete && Array.isArray(toDelete.photos)) {
        for (const photo of toDelete.photos) {
          if (photo?.url) void deleteAttachment(photo.url);
        }
      }
      const res = await deletePurchase(id);
      if (!res.success) {
        alert('Penghapusan gagal. Data belum terhapus dari database.');
        return;
      }
      loadData();
    }
  };

  const handleDuplicatePurchase = (item: PurchaseRequisition) => {
    if (!confirmDiscard()) return;
    openPurchase(duplicatePurchase(item, generateNextNomor(purchases), todayInJakarta()), false);
    setSaveNotice(`Salinan ${item.nomor} siap diedit.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleSelectForPreview = (item: PurchaseRequisition) => {
    if (!confirmDiscard()) return;
    openPurchase(item);
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
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-sm tracking-wider shadow-sm">
                FPP
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-zinc-800" />
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    PT GAGACLO
                  </span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500 hidden sm:inline">•</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 hidden sm:inline">
                    Formulir Permohonan Pembelian
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 sm:hidden">
                  Formulir Permohonan Pembelian
                </span>
              </div>
            </div>

            {/* Right Fast Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleAddNewFPP}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50 text-xs font-semibold shadow-sm"
                title="Buat formulir baru dengan nomor urut berikutnya"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Baru</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50 text-xs font-semibold shadow-sm"
                title="Cetak langsung atau simpan sebagai PDF A4 (Pasti 1 Halaman)"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Cetak PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSavePurchase}
                disabled={isSaving || isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition active:scale-95 disabled:opacity-50 text-xs font-semibold shadow-sm"
                title="Simpan formulir ke database Supabase dan penyimpanan lokal"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
              </button>

              {/* Dark / Light Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm ml-1"
                title={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto flex flex-col items-center">
        {activeTab === 'FORM' && (
          <div className="w-full grid grid-cols-1 xl:grid-cols-[minmax(0,210mm)_minmax(0,1fr)] gap-6 items-start print:block">
            <div className="w-full max-w-[210mm] mx-auto space-y-3">
              <PurchaseDocument
                key={currentPurchase.id || 'current-fpp'}
                data={currentPurchase}
                onChange={handleDocumentChange}
                onSave={handleSavePurchase}
                onGenerateNomor={handleGenerateNomor}
                saveNotice={saveNotice}
                isEditable={!isLoading}
              />
            </div>

            <div className="no-print min-w-0 space-y-4">
              {/* Storage & Cloud Status */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-mono text-[11px] text-slate-700 dark:text-zinc-300">
                    {quotaUsageText}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isTableReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                    }`}
                    title={isTableReady ? 'Database Terhubung' : 'Sedang Memeriksa'}
                  />
                </div>
                <R2Quota />
              </div>

              {!!drafts.length && (
                <details className="rounded-xl border border-slate-200 dark:border-zinc-800 p-3 text-xs bg-white dark:bg-zinc-900">
                  <summary className="cursor-pointer font-semibold">
                    Draft perangkat ini ({drafts.length})
                  </summary>
                  <div className="space-y-2 mt-3">
                    {drafts.map((draft) => (
                      <button
                        key={draft.purchase.id}
                        type="button"
                        className="block w-full text-left rounded-lg border border-slate-200 dark:border-zinc-800 p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition"
                        onClick={() => {
                          if (!confirmDiscard()) return;
                          setCurrentPurchase(draft.purchase);
                          setSavedFingerprint(
                            fingerprint(
                              purchases.find((p) => p.id === draft.purchase.id) || blankBaseline(draft.purchase)
                            )
                          );
                        }}
                      >
                        <span className="font-medium">{draft.purchase.nomor}</span> •{' '}
                        {draft.purchase.items[0]?.namaBarang || 'Belum diisi'}
                        <span className="block text-slate-500 text-[10px] mt-0.5">
                          {new Date(draft.savedAt).toLocaleString('id-ID')}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              )}

              <PurchaseSummary purchases={purchases} />

              <PurchaseList
                purchases={purchases}
                onSelectForEdit={handleSelectForEdit}
                onSelectForPreview={handleSelectForPreview}
                onAddNew={handleAddNewFPP}
                onDelete={handleDeletePurchase}
                onDuplicate={handleDuplicatePurchase}
                canEdit={true}
                canDelete={true}
                onRefresh={() => loadData()}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
