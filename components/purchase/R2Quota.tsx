'use client';

import { useEffect, useState } from 'react';
import { Cloud } from 'lucide-react';

type Usage = { enabled: boolean; bytes?: number; objects?: number; updatedAt?: string; freeTierBytes?: number };

function formatBytes(bytes: number) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

export default function R2Quota() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/attachments/usage', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        setUsage(await response.json());
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 300_000);
    window.addEventListener('fpp-attachments-updated', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('fpp-attachments-updated', refresh);
    };
  }, []);

  const text = failed ? 'R2 —' : !usage ? 'R2 …' : !usage.enabled ? 'R2 belum aktif' : `R2 ${formatBytes(usage.bytes || 0)} / 10 GB`;
  const ratio = (usage?.bytes || 0) / (usage?.freeTierBytes || 10_000_000_000);
  const color = failed || !usage?.enabled ? 'bg-amber-400' : ratio >= 1 ? 'bg-red-500' : 'bg-slate-400 dark:bg-zinc-500';
  const title = failed ? 'Pemakaian Cloudflare R2 belum dapat dimuat.' : usage?.enabled
    ? `Cloudflare R2: ${formatBytes(usage.bytes || 0)} dalam bucket FPP (${usage.objects || 0} file). Acuan gratis 10 GB berlaku bersama untuk seluruh bucket akun, bukan batas penyimpanan. Diperbarui maksimal tiap 5 menit.`
    : 'Penyimpanan lampiran Cloudflare R2';

  return (
    <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-none cursor-default select-none whitespace-nowrap" title={title} aria-label={`Kuota Cloudflare ${text}`}>
      <Cloud className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
      <span className="text-slate-700 dark:text-zinc-300 font-mono text-[11px] sm:text-xs">{text}</span>
      <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} aria-hidden="true" />
    </div>
  );
}
