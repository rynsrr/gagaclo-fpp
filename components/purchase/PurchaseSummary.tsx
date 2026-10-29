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
    <aside aria-label="Ringkasan FPP" className="no-print min-w-0 grid grid-cols-3 gap-2 content-start">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm">
          <div className="text-[10px] font-semibold uppercase leading-snug break-words text-zinc-600 dark:text-zinc-300">{card.label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-black dark:text-white">{card.count}</div>
          <div className="mt-1 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">{card.description}</div>
        </div>
      ))}
    </aside>
  );
}
