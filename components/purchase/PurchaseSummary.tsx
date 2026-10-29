import { PurchaseRequisition } from '@/types/purchase';

export default function PurchaseSummary({ purchases }: { purchases: PurchaseRequisition[] }) {
  const received = purchases.filter((purchase) =>
    Boolean(purchase.tanggalDiterima?.trim()) ||
    purchase.status === 'Diterima' || purchase.status === 'Selesai'
  ).length;
  const cards = [
    { label: 'Total Permohonan', count: purchases.length, description: 'Dokumen terdaftar' },
    { label: 'Belum Diterima', count: purchases.length - received, description: 'Menunggu penerimaan' },
    { label: 'Sudah Diterima', count: received, description: 'Penerimaan tercatat' },
  ];
  return (
    <aside aria-label="Ringkasan FPP" className="no-print min-w-0 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3 content-start xl:pt-[52px]">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{card.label}</div>
          <div className="mt-2 text-3xl font-bold tabular-nums text-black dark:text-white">{card.count}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{card.description}</div>
        </div>
      ))}
    </aside>
  );
}
