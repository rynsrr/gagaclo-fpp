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
import PasswordModal from '@/components/purchase/PasswordModal';
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
  Trash2,
  Lock,
  UserCheck,
} from 'lucide-react';

type ActiveTab = 'FORM';

function checkIsOwner(purchase?: PurchaseRequisition | null, user?: string | null): boolean {
  if (!user || !purchase) return false;
  const cleanUser = user.trim().toLowerCase();

  const peminta = (purchase.dimintaOleh || '').trim().toLowerCase();
  if (peminta && peminta === cleanUser) return true;

  const nomor = (purchase.nomor || '').trim().toUpperCase();
  if (nomor && nomor.startsWith(cleanUser.toUpperCase() + '-')) return true;

  const isNew = !purchase.id || purchase.id.startsWith('fpp-');
  if (isNew && (!peminta || peminta === cleanUser)) return true;

  return false;
}

function formatUserName(name?: string | null): string {
  if (!name) return 'Royan';
  return name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();
}

function createBlankPurchase(purchases: PurchaseRequisition[], user?: string | null): PurchaseRequisition {
  const now = new Date();
  const userName = formatUserName(user);
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
    dimintaOleh: userName,
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

  const [currentPurchase, setCurrentPurchase] = useState<PurchaseRequisition>(() => {
    let savedUser: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        savedUser = localStorage.getItem('fpp_edit_user') || sessionStorage.getItem('fpp_edit_user');
      } catch {}
    }
    return createBlankPurchase([], savedUser);
  });
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isTableReady, setIsTableReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fpp_edit_user') || sessionStorage.getItem('fpp_edit_user');
      if (saved) {
        setCurrentUser(saved);
        const formatted = formatUserName(saved);
        setCurrentPurchase((prev) => {
          const nextNomor = generateNextNomor(purchases, formatted);
          return {
            ...prev,
            nomor: nextNomor,
            dimintaOleh: formatted,
          };
        });
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('fpp_edit_user');
      sessionStorage.removeItem('fpp_edit_user');
    } catch {}
    setCurrentUser(null);
    setSaveNotice('Mode edit dikunci. Anda berada dalam Mode Lihat.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const [savedFingerprint, setSavedFingerprint] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [drafts, setDrafts] = useState<ReturnType<typeof listDrafts>>([]);
  const [selectedUser, setSelectedUser] = useState<string>('ALL');

  // Daftar akun peminta untuk kategori/filter (standar + yang ada di riwayat & draft)
  const availableUsers = React.useMemo(() => {
    const defaultUsers = ['Royan', 'Ryan', 'Ami', 'Hanami', 'Cynara'];
    const map = new Map<string, string>();
    defaultUsers.forEach((u) => map.set(u.toLowerCase(), u));

    purchases.forEach((p) => {
      const peminta = (p.dimintaOleh || '').trim();
      if (peminta && !map.has(peminta.toLowerCase())) {
        map.set(peminta.toLowerCase(), peminta.charAt(0).toUpperCase() + peminta.slice(1));
      }
      if (p.nomor && p.nomor.includes('-')) {
        const prefix = p.nomor.split('-')[0].trim();
        if (prefix && prefix !== 'FPP' && !map.has(prefix.toLowerCase())) {
          map.set(prefix.toLowerCase(), prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase());
        }
      }
    });

    drafts.forEach((d) => {
      const peminta = (d.purchase.dimintaOleh || '').trim();
      if (peminta && !map.has(peminta.toLowerCase())) {
        map.set(peminta.toLowerCase(), peminta.charAt(0).toUpperCase() + peminta.slice(1));
      }
      if (d.purchase.nomor && d.purchase.nomor.includes('-')) {
        const prefix = d.purchase.nomor.split('-')[0].trim();
        if (prefix && prefix !== 'FPP' && !map.has(prefix.toLowerCase())) {
          map.set(prefix.toLowerCase(), prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase());
        }
      }
    });

    return Array.from(map.values());
  }, [purchases, drafts]);

  // Hitung jumlah formulir per user
  const userCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    availableUsers.forEach((u) => {
      const key = u.toLowerCase();
      counts[key] = purchases.filter((p) => {
        const peminta = (p.dimintaOleh || '').trim().toLowerCase();
        const nomor = (p.nomor || '').trim().toUpperCase();
        return peminta === key || nomor.startsWith(key.toUpperCase() + '-');
      }).length;
    });
    return counts;
  }, [availableUsers, purchases]);

  // Filter permohonan sesuai kategori user (mempengaruhi Ringkasan & Tabel)
  const filteredPurchasesByUser = React.useMemo(() => {
    if (selectedUser === 'ALL') return purchases;
    const cleanUser = selectedUser.trim().toLowerCase();
    return purchases.filter((p) => {
      const peminta = (p.dimintaOleh || '').trim().toLowerCase();
      const nomor = (p.nomor || '').trim().toUpperCase();
      return peminta === cleanUser || nomor.startsWith(cleanUser.toUpperCase() + '-');
    });
  }, [purchases, selectedUser]);

  // Filter draft sesuai kategori user (mempengaruhi Draft perangkat ini)
  const filteredDrafts = React.useMemo(() => {
    if (selectedUser === 'ALL') return drafts;
    const cleanUser = selectedUser.trim().toLowerCase();
    return drafts.filter((d) => {
      const peminta = (d.purchase.dimintaOleh || '').trim().toLowerCase();
      const nomor = (d.purchase.nomor || '').trim().toUpperCase();
      return peminta === cleanUser || nomor.startsWith(cleanUser.toUpperCase() + '-');
    });
  }, [drafts, selectedUser]);
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
      let activeUser: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          activeUser = localStorage.getItem('fpp_edit_user') || sessionStorage.getItem('fpp_edit_user');
        } catch {}
      }
      const formatted = activeUser ? formatUserName(activeUser) : 'Royan';
      const blank = createBlankPurchase(savedPurchases, activeUser);
      const draft = getDraft();

      if (draft?.purchase) {
        const draftPurchase = { ...draft.purchase };
        if (activeUser) {
          draftPurchase.dimintaOleh = formatted;
          if (!draftPurchase.nomor || !draftPurchase.nomor.toUpperCase().startsWith(formatted.toUpperCase() + '-')) {
            draftPurchase.nomor = generateNextNomor(savedPurchases, formatted);
          }
        }
        setCurrentPurchase(draftPurchase);
        setSavedFingerprint(
          fingerprint(
            savedPurchases.find((p) => p.id === draftPurchase.id) || blankBaseline(draftPurchase)
          )
        );
      } else {
        setCurrentPurchase(blank);
        setSavedFingerprint(fingerprint(blank));
      }
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
    if (!currentUser) {
      setIsPasswordModalOpen(true);
      return;
    }
    if (!confirmDiscard()) return;
    openPurchase(createBlankPurchase(purchases, currentUser), false);
    setActiveTab('FORM');
    setSaveNotice('Formulir baru siap diisi.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleGenerateNomor = () => {
    const peminta = currentPurchase.dimintaOleh || currentUser || 'Royan';
    const nextNomor = generateNextNomor(purchases, peminta);
    setCurrentPurchase((prev) => ({
      ...prev,
      nomor: nextNomor,
    }));
  };

  const handleSavePurchase = async () => {
    if (!currentUser) {
      setIsPasswordModalOpen(true);
      return;
    }
    if (!checkIsOwner(currentPurchase, currentUser)) {
      alert(`Anda hanya dapat mengedit dan menyimpan FPP milik akun Anda (${formatUserName(currentUser)}). Dokumen ${currentPurchase.nomor} milik ${currentPurchase.dimintaOleh || 'akun lain'} hanya bisa dilihat.`);
      return;
    }
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
    if (!currentUser) {
      setIsPasswordModalOpen(true);
      return;
    }
    if (!confirmDiscard()) return;
    openPurchase(item);
    setActiveTab('FORM');
  };

  const handleDeletePurchase = async (id: string, nomor: string) => {
    if (!currentUser) {
      setIsPasswordModalOpen(true);
      return;
    }
    const target = purchases.find((p) => p.id === id);
    if (target && !checkIsOwner(target, currentUser)) {
      alert(`Anda tidak dapat menghapus FPP milik akun lain (${target.dimintaOleh || target.nomor}).`);
      return;
    }
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
    const peminta = currentUser ? formatUserName(currentUser) : (item.dimintaOleh || 'Royan');
    const nextNomor = generateNextNomor(purchases, peminta);
    const dup = duplicatePurchase(item, nextNomor, todayInJakarta());
    dup.dimintaOleh = peminta;
    openPurchase(dup, false);
    setSaveNotice(`Salinan ${dup.nomor} siap diedit.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

    const handleDeleteDraft = (draftId: string, draftNomor: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (confirm(`Apakah Anda yakin ingin menghapus draft ${draftNomor || 'ini'}?`)) {
      removeDraft(draftId);
      setDrafts(listDrafts());
      if (currentPurchase.id === draftId) {
        openPurchase(createBlankPurchase(purchases), false);
      }
    }
  };

  const handleClearAllDrafts = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetDrafts = filteredDrafts;
    if (!targetDrafts.length) return;
    const promptMsg = selectedUser !== 'ALL'
      ? `Apakah Anda yakin ingin menghapus SEMUA (${targetDrafts.length}) draft untuk user ${selectedUser} dari perangkat ini?`
      : `Apakah Anda yakin ingin menghapus SEMUA (${drafts.length}) draft dari perangkat ini?`;
    if (confirm(promptMsg)) {
      targetDrafts.forEach((d) => removeDraft(d.purchase.id));
      setDrafts(listDrafts());
      if (targetDrafts.some((d) => d.purchase.id === currentPurchase.id)) {
        openPurchase(createBlankPurchase(purchases), false);
      }
    }
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
              <div className="flex items-center">
                <span className="text-[28px] sm:text-[32px] leading-none font-bold tracking-tight text-black dark:text-white">
                  FPP
                </span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-zinc-800" />
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-sm sm:text-base font-semibold uppercase tracking-wide text-slate-700 dark:text-zinc-200">
                  FORMULIR PERMOHONAN PEMBELIAN
                </span>
              </div>
            </div>

            {/* Right Status & Fast Action */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Status Akun Editor */}
              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-sm"
                  title="Dokumen dalam Mode Hanya Baca. Klik untuk masuk sebagai editor"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">Mode Lihat</span>
                  <span className="sm:hidden">Masuk</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold capitalize">{currentUser}</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="ml-1 text-[10px] text-zinc-500 hover:text-red-500 hover:underline"
                    title="Keluar mode edit"
                  >
                    Keluar
                  </button>
                </div>
              )}

              <div className="no-print flex items-center gap-2" role="group" aria-label="Aksi formulir">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleAddNewFPP}
                  className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50 shadow-sm"
                  aria-label="Formulir baru"
                  title="Buat formulir baru dengan nomor urut berikutnya"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50 shadow-sm"
                  aria-label="Cetak / PDF"
                  title="Cetak langsung atau simpan sebagai PDF A4 (Pasti 1 Halaman)"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSavePurchase}
                  disabled={isSaving || isLoading}
                  className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-emerald-600 hover:bg-emerald-700 text-white transition active:scale-95 disabled:opacity-50 shadow-sm"
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
              <R2Quota />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto flex flex-col items-center">
        {activeTab === 'FORM' && (
          <div className="w-full grid grid-cols-1 xl:grid-cols-[minmax(0,210mm)_minmax(0,1fr)] gap-6 items-start print:block">
            <div className="w-full max-w-[210mm] mx-auto space-y-3">
              {!currentUser ? (
                <div className="no-print flex items-center justify-between p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Dokumen dalam <strong>Mode Lihat</strong>. Masuk dengan akun editor untuk mengedit.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition active:scale-95 shrink-0"
                  >
                    Masuk Edit
                  </button>
                </div>
              ) : !checkIsOwner(currentPurchase, currentUser) ? (
                <div className="no-print flex items-center justify-between p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/90 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Dokumen <strong>{currentPurchase.nomor}</strong> dibuat oleh <strong>{currentPurchase.dimintaOleh || 'Akun Lain'}</strong>. Anda masuk sebagai <strong>{formatUserName(currentUser)}</strong> (Hanya bisa melihat, tidak bisa mengedit FPP akun lain).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDuplicatePurchase(currentPurchase)}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition active:scale-95 shrink-0"
                    title="Buat salinan formulir ini atas nama Anda"
                  >
                    Salin ke Akun Saya
                  </button>
                </div>
              ) : null}
              <PurchaseDocument
                key={currentPurchase.id || 'current-fpp'}
                data={currentPurchase}
                onChange={handleDocumentChange}
                onSave={handleSavePurchase}
                onGenerateNomor={handleGenerateNomor}
                saveNotice={saveNotice}
                isEditable={Boolean(currentUser) && checkIsOwner(currentPurchase, currentUser) && !isLoading}
                currentUser={currentUser}
              />
            </div>

            <div className="no-print min-w-0 space-y-4">
              {/* Draft perangkat ini (terfilter mengikuti kategori user) */}
              {filteredDrafts.length > 0 && (
                <details className="rounded-xl border border-slate-200 dark:border-zinc-800 p-3 text-xs bg-white dark:bg-zinc-900" open>
                  <summary className="cursor-pointer font-semibold flex items-center justify-between select-none">
                    <span>
                      Draft perangkat ini ({filteredDrafts.length})
                      {selectedUser !== 'ALL' && (
                        <span className="ml-1 text-slate-500 font-normal">
                          • {selectedUser}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllDrafts}
                      className="text-[11px] font-normal text-red-500 hover:text-red-700 hover:underline px-1 py-0.5"
                      title={selectedUser !== 'ALL' ? `Bersihkan semua draft ${selectedUser}` : 'Bersihkan semua draft lokal'}
                    >
                      Hapus Semua
                    </button>
                  </summary>
                  <div className="space-y-2 mt-3">
                    {filteredDrafts.map((draft) => (
                      <div
                        key={draft.purchase.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition group"
                      >
                        <button
                          type="button"
                          className="flex-1 text-left min-w-0"
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
                          <span className="font-medium text-slate-800 dark:text-zinc-200">{draft.purchase.nomor}</span> •{' '}
                          <span className="text-slate-600 dark:text-zinc-400">{draft.purchase.items[0]?.namaBarang || 'Belum diisi'}</span>
                          <span className="block text-slate-500 text-[10px] mt-0.5">
                            {new Date(draft.savedAt).toLocaleString('id-ID')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDraft(draft.purchase.id, draft.purchase.nomor, e)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition shrink-0"
                          title="Hapus draft ini dari perangkat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Ringkasan FPP (terfilter mengikuti kategori user) */}
              <PurchaseSummary purchases={filteredPurchasesByUser} userName={selectedUser} />

              {/* Daftar FPP */}
              <PurchaseList
                purchases={purchases}
                onSelectForEdit={handleSelectForEdit}
                onSelectForPreview={handleSelectForPreview}
                onAddNew={handleAddNewFPP}
                onDelete={handleDeletePurchase}
                onDuplicate={handleDuplicatePurchase}
                canEdit={Boolean(currentUser)}
                canDelete={Boolean(currentUser)}
                currentUser={currentUser}
                onRefresh={() => loadData()}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                availableUsers={availableUsers}
                userCounts={userCounts}
                totalAllPurchases={purchases.length}
              />
            </div>
          </div>
        )}
      </main>
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={(username) => {
          setCurrentUser(username);
          const formatted = formatUserName(username);
          const nextNomor = generateNextNomor(purchases, formatted);
          // Otomatis ubah nomor dan peminta ("Diminta") mengikuti user yang masuk
          setCurrentPurchase((prev) => ({
            ...prev,
            nomor: nextNomor,
            dimintaOleh: formatted,
          }));
          setSaveNotice(`Masuk sebagai ${formatted}. Nomor otomatis: ${nextNomor}`);
          setTimeout(() => setSaveNotice(null), 3500);
        }}
      />
    </div>
  );
}
