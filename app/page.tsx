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
import PurchaseDashboard from '@/components/purchase/PurchaseDashboard';
import MobilePurchaseEditor from '@/components/purchase/MobilePurchaseEditor';
import MobileA4Preview from '@/components/purchase/MobileA4Preview';
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
import {
  syncMasterItemsFromPurchases,
  recordMasterItem,
} from '@/lib/itemCatalogService';
import { getUsers } from '@/lib/userService';

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
  LayoutDashboard,
  FileEdit,
  FileText,
  List,
  Ban,
  RotateCcw,
} from 'lucide-react';

type ActiveTab = 'FORM' | 'DASHBOARD';
type MobileTab = 'DASHBOARD' | 'FORM' | 'PREVIEW' | 'LIST';

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('FORM');
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
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalTab, setPasswordModalTab] = useState<'SELECT' | 'MANAGE'>('SELECT');
  const [userVersion, setUserVersion] = useState(0);

  useEffect(() => {
    const handler = () => setUserVersion((v) => v + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('fpp-users-updated', handler);
      return () => window.removeEventListener('fpp-users-updated', handler);
    }
  }, []);

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
    const defaultUsers = getUsers().map(formatUserName);
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
  }, [purchases, drafts, userVersion]);

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
    syncMasterItemsFromPurchases(savedPurchases);
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

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddNewFPP = () => {
    if (!currentUser) {
      setIsPasswordModalOpen(true);
      return;
    }
    if (!confirmDiscard()) return;
    openPurchase(createBlankPurchase(purchases, currentUser), false);
    setActiveTab('FORM');
    setMobileTab('FORM');
    scrollToTop();
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
        // Simpan setiap item ke master katalog agar otomatis tersedia untuk input berikutnya
        snapshot.items.forEach((item) => {
          if (item.namaBarang && item.namaBarang.trim()) {
            const match = (item.banyaknya || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
            recordMasterItem({
              namaBarang: item.namaBarang,
              satuan: item.satuan || match?.[2] || '',
              hargaSatuan: item.hargaSatuan,
              supplier: item.supplier,
            });
          }
        });
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
    setMobileTab('FORM');
    scrollToTop();
  };

  const handleToggleCancelPurchase = async (targetItem?: PurchaseRequisition) => {
    const item = targetItem || currentPurchase;
    if (!currentUser) {
      setIsPasswordModalOpen(true);
      return;
    }
    if (!checkIsOwner(item, currentUser)) {
      alert(
        `Anda hanya dapat membatalkan FPP milik akun Anda (${formatUserName(currentUser)}).`
      );
      return;
    }

    const isCurrentlyCancelled = item.status === 'Dibatalkan';
    const confirmMsg = isCurrentlyCancelled
      ? `Aktifkan kembali formulir ${item.nomor || 'ini'}?`
      : `Batalkan (Cancel) formulir ${item.nomor || 'ini'}? Data tetap tersimpan di arsip dengan status Dibatalkan.`;
    if (!confirm(confirmMsg)) return;

    const updated: PurchaseRequisition = {
      ...item,
      status: isCurrentlyCancelled ? 'Diajukan' : 'Dibatalkan',
      updatedAt: new Date().toISOString(),
    };

    const existsInSaved = purchases.some((p) => p.id === updated.id);
    if (existsInSaved) {
      setIsSaving(true);
      const res = await savePurchase(updated);
      setIsSaving(false);
      if (!res.success) {
        alert('Gagal memperbarui status pembatalan FPP.');
        return;
      }
      setPurchases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (currentPurchase.id === updated.id) {
        setCurrentPurchase(updated);
        setSavedFingerprint(fingerprint(updated));
      }
    } else if (currentPurchase.id === updated.id) {
      setCurrentPurchase(updated);
    }

    setSaveNotice(
      isCurrentlyCancelled
        ? `Formulir ${updated.nomor} diaktifkan kembali.`
        : `Formulir ${updated.nomor} ditandai Dibatalkan.`
    );
    setTimeout(() => setSaveNotice(null), 3500);
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
    dup.status = 'Draft';
    openPurchase(dup, false);
    setActiveTab('FORM');
    setMobileTab('FORM');
    scrollToTop();
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
    setMobileTab('PREVIEW');
    scrollToTop();
  };

  const canEditCurrent = Boolean(currentUser) && checkIsOwner(currentPurchase, currentUser) && !isLoading;
  const isCurrentCancelled = currentPurchase.status === 'Dibatalkan';

  return (
    <div className="min-h-[100dvh] bg-slate-100 dark:bg-[#08090C] text-slate-900 dark:text-[#F5F5F7] flex flex-col transition-colors duration-200">
      {/* Top Navigation Bar (Hidden during print) */}
      <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-[#08090C]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-3 sm:px-4 py-2 sm:py-3">
        {/* Mobile Compact Header (< md) */}
        <div className="md:hidden flex items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl leading-none font-bold tracking-tight text-black dark:text-white shrink-0">
              FPP
            </span>
            <button
              type="button"
              onClick={() => {
                setPasswordModalTab('SELECT');
                setIsPasswordModalOpen(true);
              }}
              className="min-h-[40px] max-w-[140px] px-2.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 inline-flex items-center gap-1.5 truncate active:scale-95 transition"
              aria-label={currentUser ? `Akun aktif ${currentUser}, ketuk untuk ganti` : 'Pilih akun editor'}
            >
              {currentUser ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold capitalize truncate">{currentUser}</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <span className="truncate">Pilih Akun</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleAddNewFPP}
              aria-label="Buat formulir baru"
              className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 flex items-center justify-center active:scale-95 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleSavePurchase}
              disabled={isSaving || isLoading}
              aria-label={isSaving ? 'Menyimpan...' : 'Simpan FPP'}
              aria-busy={isSaving}
              className="relative min-h-[44px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{isSaving ? '...' : 'Simpan'}</span>
              {dirty && !isSaving && (
                <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500" aria-label="Perubahan belum disimpan" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 flex items-center justify-center active:scale-95 transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-slate-200" aria-hidden="true" /> : <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Desktop & Tablet Header (>= md) */}
        <div className="hidden md:block max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Logo, Company Title & View Switcher */}
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <span className="text-[30px] leading-none font-bold tracking-tight text-black dark:text-white">
                  FPP
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />
              <nav aria-label="Navigasi utama" className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('FORM')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'FORM'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Formulir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('DASHBOARD')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'DASHBOARD'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Dashboard</span>
                </button>
              </nav>
            </div>

            {/* Right Status & Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Status Akun Editor */}
              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalTab('SELECT');
                    setIsPasswordModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 transition"
                  title="Klik untuk memilih akun Anda"
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" aria-hidden="true" />
                  <span>Pilih Akun</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800/80 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold capitalize">{currentUser}</span>
                  <div className="flex items-center space-x-1.5 border-l border-slate-300 dark:border-zinc-700 pl-2 text-[11px] text-slate-500 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordModalTab('SELECT');
                        setIsPasswordModalOpen(true);
                      }}
                      className="hover:text-slate-900 dark:hover:text-white transition"
                      title="Ganti ke akun lain"
                    >
                      Ganti
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordModalTab('MANAGE');
                        setIsPasswordModalOpen(true);
                      }}
                      className="hover:text-slate-900 dark:hover:text-white transition"
                      title="Kelola akun (tambah/hapus user)"
                    >
                      Kelola
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-red-600 dark:text-red-400 hover:underline"
                      title="Keluar mode edit"
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Group */}
              <div className="no-print flex items-center gap-1.5" role="group" aria-label="Aksi formulir">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleAddNewFPP}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition text-xs font-medium disabled:opacity-50"
                  aria-label="Formulir baru"
                  title="Buat formulir baru dengan nomor urut berikutnya"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Baru</span>
                </button>
                {canEditCurrent && activeTab === 'FORM' && (
                  <button
                    type="button"
                    disabled={isSaving || isLoading}
                    onClick={() => handleToggleCancelPurchase()}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition text-xs font-medium disabled:opacity-50 ${
                      isCurrentCancelled
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                    }`}
                    title={isCurrentCancelled ? 'Aktifkan kembali formulir ini' : 'Batalkan (Cancel) formulir ini'}
                  >
                    {isCurrentCancelled ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Aktifkan</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Cancel</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition text-xs font-medium disabled:opacity-50"
                  aria-label="Cetak / PDF"
                  title="Cetak langsung atau simpan sebagai PDF A4 (Pasti 1 Halaman)"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePurchase}
                  disabled={isSaving || isLoading}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black transition text-xs font-medium shadow-sm disabled:opacity-50"
                  aria-label={isSaving ? 'Menyimpan...' : 'Simpan FPP'}
                  aria-busy={isSaving}
                  title="Simpan formulir ke database Supabase dan penyimpanan lokal"
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition"
                title={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-slate-200" aria-hidden="true" /> : <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />}
              </button>

              {/* Quota Indicators */}
              <div className="hidden xl:flex items-center gap-1.5">
                <div
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 select-none"
                  title={`Penggunaan Kuota Database: ${quotaUsageText} (${purchases.length} FPP tersimpan)`}
                  aria-label={`Kuota database ${quotaUsageText}`}
                >
                  <Database className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  <span className="font-mono">{quotaUsageText}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isTableReady ? 'bg-slate-400 dark:bg-zinc-500' : 'bg-amber-400'}`} />
                </div>
                <R2Quota />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-3 pt-3 pb-24 md:p-6 max-w-7xl w-full mx-auto flex flex-col items-center print:p-0">
        {/* Desktop/Tablet Dashboard View */}
        {activeTab === 'DASHBOARD' && (
          <div className="hidden md:block no-print w-full">
            <PurchaseDashboard
              purchases={purchases}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
              availableUsers={availableUsers}
              onOpenPurchase={(item) => handleSelectForEdit(item)}
              onAddNew={handleAddNewFPP}
            />
          </div>
        )}

        {/* Mobile Dashboard Tab */}
        {mobileTab === 'DASHBOARD' && (
          <div className="md:hidden no-print w-full">
            <PurchaseDashboard
              purchases={purchases}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
              availableUsers={availableUsers}
              onOpenPurchase={(item) => {
                if (currentUser && checkIsOwner(item, currentUser)) {
                  handleSelectForEdit(item);
                } else {
                  handleSelectForPreview(item);
                }
              }}
              onAddNew={handleAddNewFPP}
            />
          </div>
        )}

        {/* Form + List Workspace (always mounted for print, visibility controlled per breakpoint/tab) */}
        <div
          className={`w-full grid grid-cols-1 xl:grid-cols-[minmax(0,210mm)_minmax(0,1fr)] gap-6 items-start print:block ${
            activeTab === 'DASHBOARD' ? 'md:hidden print:block' : ''
          }`}
        >
          {/* Left Column: Editor (Mobile) + A4 Document (Desktop/Tablet/Mobile Preview/Print) */}
          <div className="w-full max-w-[210mm] mx-auto space-y-3 print:max-w-none print:space-y-0">
            {/* Access / Ownership Banner (shown on mobile FORM & PREVIEW, and desktop FORM) */}
            <div className={mobileTab === 'FORM' || mobileTab === 'PREVIEW' ? 'block' : 'hidden md:block'}>
              {!currentUser ? (
                <div className="no-print flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-3 rounded-xl sm:rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-700 dark:text-zinc-300 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>Dokumen dalam <strong>Mode Lihat</strong>. Pilih akun editor untuk mulai mengedit.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordModalTab('SELECT');
                      setIsPasswordModalOpen(true);
                    }}
                    className="min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:py-1 rounded-lg sm:rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-medium text-xs transition shrink-0"
                  >
                    Pilih Akun
                  </button>
                </div>
              ) : !checkIsOwner(currentPurchase, currentUser) ? (
                <div className="no-print flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-3 rounded-xl sm:rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-700 dark:text-zinc-300 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>
                      Dokumen <strong>{currentPurchase.nomor}</strong> milik <strong>{currentPurchase.dimintaOleh || 'Akun Lain'}</strong> (Hanya baca).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDuplicatePurchase(currentPurchase)}
                    className="min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:py-1 rounded-lg sm:rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-800 dark:text-zinc-200 font-medium text-xs transition shrink-0"
                    title="Buat salinan formulir ini atas nama Anda"
                  >
                    Salin ke Akun Saya
                  </button>
                </div>
              ) : null}
            </div>

            {/* Mobile Native Touch Editor (< md, when mobileTab === 'FORM') */}
            {mobileTab === 'FORM' && (
              <div className="md:hidden no-print">
                <MobilePurchaseEditor
                  data={currentPurchase}
                  onChange={handleDocumentChange}
                  onGenerateNomor={handleGenerateNomor}
                  onToggleCancel={() => handleToggleCancelPurchase()}
                  saveNotice={saveNotice}
                  isEditable={canEditCurrent}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* Physical A4 Document (visible on md+, mobile PREVIEW tab, and ALWAYS in print) */}
            <div className={mobileTab === 'PREVIEW' ? 'block' : 'hidden md:block print:block'}>
              <MobileA4Preview onPrint={() => window.print()}>
                <PurchaseDocument
                  key={currentPurchase.id || 'current-fpp'}
                  data={currentPurchase}
                  onChange={handleDocumentChange}
                  onSave={handleSavePurchase}
                  onGenerateNomor={handleGenerateNomor}
                  onToggleCancel={() => handleToggleCancelPurchase()}
                  saveNotice={saveNotice}
                  isEditable={canEditCurrent}
                  currentUser={currentUser}
                />
              </MobileA4Preview>
            </div>
          </div>

          {/* Right Column: Drafts, Summary & Purchase List (visible on md+, and mobile LIST tab) */}
          <div className={`no-print min-w-0 space-y-4 ${mobileTab === 'LIST' ? 'block' : 'hidden md:block'}`}>
            {/* Draft perangkat ini (terfilter mengikuti kategori user) */}
            {filteredDrafts.length > 0 && (
              <details className="rounded-2xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 p-3.5 sm:p-3 text-xs bg-white dark:bg-zinc-900" open>
                <summary className="cursor-pointer font-semibold flex items-center justify-between select-none min-h-[36px]">
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
                    className="text-[11px] font-normal text-red-600 dark:text-red-400 hover:underline px-2 py-1"
                    title={selectedUser !== 'ALL' ? `Bersihkan semua draft ${selectedUser}` : 'Bersihkan semua draft lokal'}
                  >
                    Hapus Semua
                  </button>
                </summary>
                <div className="space-y-2 mt-3">
                  {filteredDrafts.map((draft) => (
                    <div
                      key={draft.purchase.id}
                      className="flex items-center justify-between gap-2 rounded-xl sm:rounded-lg border border-slate-200 dark:border-zinc-800 p-2.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition group"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left min-w-0 py-0.5"
                        onClick={() => {
                          if (!confirmDiscard()) return;
                          setCurrentPurchase(draft.purchase);
                          setSavedFingerprint(
                            fingerprint(
                              purchases.find((p) => p.id === draft.purchase.id) || blankBaseline(draft.purchase)
                            )
                          );
                          setMobileTab('FORM');
                          scrollToTop();
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
                        className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 p-1.5 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition shrink-0"
                        aria-label={`Hapus draft ${draft.purchase.nomor}`}
                        title="Hapus draft ini dari perangkat"
                      >
                        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
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
              onToggleCancel={(item) => handleToggleCancelPurchase(item)}
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
      </main>

      {/* Mobile Bottom Navigation Bar (< md, hidden during print) */}
      <nav
        aria-label="Navigasi mobile"
        className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#08090C]/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 pb-safe"
      >
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {(
            [
              { id: 'DASHBOARD' as MobileTab, label: 'Dashboard', icon: LayoutDashboard },
              { id: 'FORM' as MobileTab, label: 'Isi FPP', icon: FileEdit },
              { id: 'PREVIEW' as MobileTab, label: 'Pratinjau', icon: FileText },
              { id: 'LIST' as MobileTab, label: 'Daftar', icon: List, badge: purchases.length },
            ]
          ).map((tab) => {
            const Icon = tab.icon;
            const active = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMobileTab(tab.id);
                  scrollToTop();
                }}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-[58px] flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition active:scale-95 ${
                  active
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-slate-900 dark:bg-white" />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[16px] px-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        initialTab={passwordModalTab}
        onLogout={handleLogout}
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
