import { PurchaseRequisition } from '@/types/purchase';
import { getPurchaseReceiptStats } from '@/lib/purchaseService';

interface PurchaseSummaryProps {
  purchases: PurchaseRequisition[];
  userName?: string;
}

export default function PurchaseSummary({ purchases, userName = 'ALL' }: PurchaseSummaryProps) {
  let received = 0;
  let partial = 0;
  let cancelled = 0;

  purchases.forEach((purchase) => {
    const { state } = getPurchaseReceiptStats(purchase);
    if (state === 'cancelled') cancelled += 1;
    else if (state === 'complete') received += 1;
    else if (state === 'partial') partial += 1;
  });

  const activeTotal = purchases.length - cancelled;
  const pending = Math.max(0, activeTotal - received - partial);
  const isFiltered = userName && userName !== 'ALL';

  const cards = [
    {
      label: isFiltered ? `Aktif (${userName})` : 'FPP Aktif',
      count: activeTotal,
      description: cancelled > 0 ? `${cancelled} dibatalkan` : isFiltered ? `Milik ${userName}` : 'Total terdaftar',
    },
    {
      label: partial > 0 ? 'Proses / Parsial' : 'Belum Diterima',
      count: pending + partial,
      description: partial > 0 ? `${partial} sebagian diterima` : 'Menunggu proses',
    },
    {
      label: 'Sudah Diterima',
      count: received,
      description: 'Penerimaan lengkap',
    },
  ];

  return (
    <aside
      aria-label="Ringkasan FPP"
      className="no-print min-w-0 grid grid-cols-3 rounded-xl sm:rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-x divide-slate-200 dark:divide-zinc-800 shadow-sm"
    >
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 p-2.5 sm:px-3.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
            {card.label}
          </div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {card.count}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
            {card.description}
          </div>
        </div>
      ))}
    </aside>
  );
}
