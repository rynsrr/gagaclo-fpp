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

// Components
import PurchaseDocument from '@/components/purchase/PurchaseDocument';
import PurchaseList from '@/components/purchase/PurchaseList';
import PurchaseSummary from '@/components/purchase/PurchaseSummary';
import PasswordModal from '@/components/purchase/PasswordModal';
import R2Quota from '@/components/purchase/R2Quota';
import { blankBaseline, duplicatePurchase, fingerprint, getDraft, listDrafts, removeDraft, storeDraft, validatePurchase, ValidationErrors } from '@/lib/purchaseEditing';
import PurchaseHistory from '@/components/purchase/PurchaseHistory';
import AccessPanel from '@/components/purchase/AccessPanel';
import AuthGate, {useFppAccess} from '@/components/purchase/AuthGate';

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

function MainPage() {
  const access=useFppAccess();
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

  const [validationErrors,setValidationErrors] = useState<ValidationErrors>({});
  const [savedFingerprint,setSavedFingerprint] = useState('');
  const [draftReady,setDraftReady] = useState(false);
  const [draftStatus,setDraftStatus] = useState('');
  const [drafts,setDrafts]=useState<ReturnType<typeof listDrafts>>([]);
  const [historyOpen,setHistoryOpen] = useState(false);
  const currentRef = useRef(currentPurchase);
  currentRef.current = currentPurchase;
  const dirty = draftReady && fingerprint(currentPurchase) !== savedFingerprint;
  const openPurchase = (item: PurchaseRequisition, restore = true) => {
    const draft = restore ? getDraft(item.id) : null;
    setCurrentPurchase(draft?.purchase || item);
    setSavedFingerprint(fingerprint(item));
    setValidationErrors({});
    setDraftStatus(draft ? 'Draft lokal dipulihkan' : '');
  };
  const handleDocumentChange = (item: PurchaseRequisition) => {
    setCurrentPurchase(item);
    if (Object.keys(validationErrors).length) setValidationErrors(validatePurchase(item,purchases));
  };
  useEffect(() => {
    if (!draftReady || !dirty || isLoading || !isEditUnlocked) return;
    setDraftStatus('Menyimpan draft…');
    const timer=window.setTimeout(()=>{
      try { storeDraft(currentPurchase); setDrafts(listDrafts()); setDraftStatus('Draft tersimpan di perangkat ini'); }
      catch { setDraftStatus('Draft belum tersimpan: penyimpanan perangkat penuh'); }
    },500);
    return ()=>window.clearTimeout(timer);
  },[currentPurchase,dirty,draftReady,isLoading,isEditUnlocked]);
  useEffect(()=>{
    const flush=()=>{if(draftReady && dirty){try{storeDraft(currentRef.current);}catch{}}};
    window.addEventListener('pagehide',flush);
    document.addEventListener('visibilitychange',flush);
    window.addEventListener('fpp-flush-draft',flush);
    return ()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',flush);window.removeEventListener('fpp-flush-draft',flush);};
  },[draftReady,dirty]);

  useEffect(()=>{if(access.required)setIsEditUnlocked(access.canEdit);},[access.required,access.canEdit]);

  // Sync edit mode from sessionStorage on mount
  useEffect(() => {
    try {
      if (!access.required && sessionStorage.getItem('fpp_edit_unlocked') === 'true') {
        setIsEditUnlocked(true);
      }
    } catch {}
  }, []);

  const requestEditAccess = (onSuccessAction?: () => void) => {
    if(access.required){
      if(!access.canEdit){setSaveNotice('Akun ini hanya dapat melihat dan mencetak FPP.');return false;}
      setIsEditUnlocked(true);onSuccessAction?.();return true;
    }
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
    if (initialize) {
      const draft=getDraft();
      const blank=createBlankPurchase(savedPurchases);
      setCurrentPurchase(draft?.purchase || blank);
      setSavedFingerprint(fingerprint(draft ? savedPurchases.find(p=>p.id===draft.purchase.id) || blankBaseline(draft.purchase) : blank));
      setDraftStatus(draft ? 'Draft lokal dipulihkan' : '');
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
    try { storeDraft(currentPurchase); return true; }
    catch { return confirm('Draft belum dapat disimpan di perangkat. Tinggalkan perubahan ini?'); }
  };
  useEffect(() => {
    const beforeUnload=(event: BeforeUnloadEvent)=>{
      if(!dirty) return;
      try { storeDraft(currentRef.current); }
      catch { event.preventDefault(); event.returnValue=''; }
    };
    window.addEventListener('beforeunload',beforeUnload);
    return ()=>window.removeEventListener('beforeunload',beforeUnload);
  },[dirty]);

  const handleAddNewFPP = () => {
    if (!isEditUnlocked) {
      requestEditAccess(() => {
        openPurchase(createBlankPurchase(purchases),false);
        setActiveTab('FORM');
        setSaveNotice('Formulir baru berhasil dibuat. Silakan ketik langsung pada formulir.');
        setTimeout(() => setSaveNotice(null), 3500);
      });
      return;
    }
    if (!confirmDiscard()) return;
    openPurchase(createBlankPurchase(purchases),false);
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
      requestEditAccess();
      return;
    }
    if (isSaving) return;
    const errors=validatePurchase(currentPurchase,purchases);
    setValidationErrors(errors);
    if(Object.keys(errors).length) {
      setSaveNotice('Periksa kolom yang ditandai sebelum menyimpan.');
      window.setTimeout(()=>document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),0);
      return;
    }
    const snapshot=structuredClone(currentPurchase);
    setIsSaving(true);
    setSaveNotice(null);

    const result = await savePurchase(snapshot);
    setIsSaving(false);

    if (result.success) {
      setSaveNotice(result.fromCloud ? `FPP ${snapshot.nomor} tersimpan di cloud.` : `FPP ${snapshot.nomor} tersimpan lokal; belum tersinkron ke cloud.`);
      setPurchases(previous=>previous.some(p=>p.id===snapshot.id) ? previous.map(p=>p.id===snapshot.id?snapshot:p) : [snapshot,...previous]);
      setSavedFingerprint(fingerprint(snapshot));
      if(fingerprint(currentRef.current)===fingerprint(snapshot)) {
        try { removeDraft(snapshot.id); setDrafts(listDrafts()); } catch {}
        setDraftStatus(result.fromCloud ? 'Tersimpan di cloud' : 'Tersimpan lokal, menunggu sinkronisasi');
      }
      setTimeout(() => setSaveNotice(null), 4000);
    } else {
      alert('Gagal menyimpan formulir.');
    }
  };

  const handleSelectForEdit = (item: PurchaseRequisition) => {
    if (!isEditUnlocked) {
      requestEditAccess(() => {
        openPurchase(item);
        setActiveTab('FORM');
      });
      return;
    }
    if (!confirmDiscard()) return;
    openPurchase(item);
    setActiveTab('FORM');
  };

  const handleDeletePurchase = (id: string, nomor: string) => {
    if(!access.canDelete){setSaveNotice('Hanya admin yang dapat menghapus FPP.');return;}
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

  const handleDuplicatePurchase = (item: PurchaseRequisition) => {
    const duplicate=()=>{
      if(!confirmDiscard()) return;
      openPurchase(duplicatePurchase(item,generateNextNomor(purchases),todayInJakarta()),false);
      setSaveNotice(`Salinan ${item.nomor} siap diedit. Simpan untuk membuat FPP baru.`);
    };
    if(!isEditUnlocked) {requestEditAccess(duplicate);return;}
    duplicate();
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Mode Edit Lock / Unlock Button */}
            {!isEditUnlocked ? (
              <button
                type="button"
                onClick={() => requestEditAccess()}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-sm"
                disabled={!access.canEdit}
                title={access.canEdit ? "Klik untuk membuka Mode Edit" : "Akun ini hanya dapat melihat dan mencetak"}
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
            <R2Quota />

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
                <span>Dokumen dalam <strong>Mode Hanya Baca</strong>. {access.required ? (access.canEdit ? 'Buka mode edit untuk mengubah formulir.' : 'Akun Anda memiliki izin lihat dan cetak.') : 'Masukkan password untuk mengedit.'}</span>
              </div>
              <button
                type="button"
                disabled={!access.canEdit}
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
          <div className="no-print flex flex-wrap items-center justify-between gap-2 text-xs">
            <p role="status" aria-live="polite" className={dirty ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>{dirty ? `Belum disimpan ke cloud • ${draftStatus || 'Draft aktif'}` : draftStatus || 'Formulir siap diisi'}</p>
            <button type="button" onClick={()=>setHistoryOpen(value=>!value)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700">Riwayat perubahan</button>
          </div>
          {Object.keys(validationErrors).length>0 && <div role="alert" className="no-print border border-red-300 bg-red-50 text-red-800 rounded-xl p-3 text-xs"><strong>Lengkapi formulir:</strong><ul className="list-disc pl-4">{Object.entries(validationErrors).map(([key,message])=><li key={key}>{key.startsWith('items.') ? `Baris ${Number(key.split('.')[1])+1}: ` : ''}{message}</li>)}</ul></div>}
          {historyOpen && <PurchaseHistory purchaseId={currentPurchase.id} />}
          <PurchaseDocument
            key={currentPurchase.id || 'current-fpp'}
            data={currentPurchase}
            onChange={handleDocumentChange}
            validationErrors={validationErrors}
            onSave={handleSavePurchase}
            onGenerateNomor={handleGenerateNomor}
            saveNotice={saveNotice}
            isEditable={isEditUnlocked && !isLoading}
          />
          </div>
          <div className="no-print min-w-0 space-y-4">
          <AccessPanel />
          {!!drafts.length && <details className="rounded-xl border border-slate-200 dark:border-zinc-800 p-3 text-xs"><summary className="cursor-pointer font-semibold">Draft perangkat ini ({drafts.length})</summary><div className="space-y-2 mt-3">{drafts.map(draft=><button key={draft.purchase.id} type="button" className="block w-full text-left rounded border border-slate-200 dark:border-zinc-800 p-2" onClick={()=>{
            if(!confirmDiscard())return;
            setCurrentPurchase(draft.purchase);
            setSavedFingerprint(fingerprint(purchases.find(p=>p.id===draft.purchase.id) || blankBaseline(draft.purchase)));
            setValidationErrors({});setDraftStatus('Draft lokal dipulihkan');
          }}>{draft.purchase.nomor} • {draft.purchase.items[0]?.namaBarang || 'Belum diisi'}<span className="block text-slate-500">{new Date(draft.savedAt).toLocaleString('id-ID')}</span></button>)}</div></details>}
          <PurchaseSummary purchases={purchases} />
            <PurchaseList
              purchases={purchases}
              onSelectForEdit={handleSelectForEdit}
              onSelectForPreview={handleSelectForPreview}
              onAddNew={handleAddNewFPP}
              onDelete={handleDeletePurchase}
              onDuplicate={handleDuplicatePurchase}
              canEdit={access.canEdit}
              canDelete={access.canDelete}
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

export default function Page(){return <AuthGate><MainPage/></AuthGate>;}
