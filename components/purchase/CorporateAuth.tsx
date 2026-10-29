'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getLocalPurchases, savePurchase } from '@/lib/purchaseService';

export default function CorporateAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const checkAccess = useCallback(async () => {
    const run = ++generation.current;
    setChecking(true);
    if (!supabase) { setNotice('Koneksi database belum tersedia.'); setChecking(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (run !== generation.current) return;
    if (!session) { setReady(false); setChecking(false); return; }
    const { data, error } = await supabase.from('fpp_allowed_emails').select('email').eq('email', session.user.email?.toLowerCase() || '');
    if (run !== generation.current) return;
    if (error || !data?.length) {
      setReady(false); setChecking(false);
      setNotice(error ? 'Tidak dapat memeriksa akses database. Coba lagi.' : 'Email ini belum memiliki akses ke FPP Corporate.');
      return;
    }
    // Copy existing browser documents to Corporate before loading the cloud list.
    const { data: cloudRows, error: listError } = await supabase.from('purchase_requisitions').select('id, updated_at');
    if (listError) { setNotice('Database belum dapat dibaca. Coba periksa akses kembali.'); setChecking(false); return; }
    const cloudVersions = new Map((cloudRows || []).map((row) => [row.id, row.updated_at]));
    const local = getLocalPurchases().filter((purchase) => {
      const cloudUpdated = cloudVersions.get(purchase.id);
      return !cloudVersions.has(purchase.id) || (purchase.pendingSync && new Date(purchase.updatedAt).getTime() > new Date(cloudUpdated || 0).getTime());
    });
    for (const purchase of local) {
      const result = await savePurchase(purchase);
      if (run !== generation.current) return;
      if (!result.fromCloud) {
        setNotice('Sinkronisasi data browser belum selesai. Data lokal tetap tersimpan. Klik Periksa akses untuk mencoba lagi.');
        setChecking(false); return;
      }
    }
    setReady(true); setChecking(false); setNotice('');
  }, []);

  useEffect(() => {
    void checkAccess();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { generation.current++; setReady(false); setChecking(false); }
      else if (event === 'SIGNED_IN') setTimeout(() => void checkAccess(), 0);
    });
    return () => { generation.current++; subscription?.data.subscription.unsubscribe(); };
  }, [checkAccess]);

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200">Memeriksa akses dan sinkronisasi data…</div>;
  if (ready) return <>{children}</>;
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <h1 className="text-xl font-semibold">FPP Corporate · Gagaclo</h1>
        <p className="text-sm text-zinc-500">Masuk menggunakan email yang terdaftar untuk membuka dan menyimpan formulir.</p>
        <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault(); if (!supabase || busy) return;
          setBusy(true); setNotice('');
          try {
            const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: window.location.origin } });
            setNotice(error ? error.message : 'Tautan login sudah dikirim. Buka email Anda untuk masuk.');
          } catch { setNotice('Gagal mengirim tautan login. Periksa koneksi dan coba lagi.'); }
          finally { setBusy(false); }
        }}>
          <label className="block text-sm" htmlFor="login-email">Email</label>
          <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" />
          <button disabled={busy} className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black px-3 py-2 disabled:opacity-50">{busy ? 'Mengirim…' : 'Kirim tautan login'}</button>
        </form>
        {notice && <p role="status" className="text-sm">{notice}</p>}
        <div className="flex justify-between text-xs text-zinc-500">
          <button onClick={() => void checkAccess()}>Periksa akses</button>
          <button onClick={() => void supabase?.auth.signOut()}>Keluar / ganti akun</button>
        </div>
      </div>
    </main>
  );
}
