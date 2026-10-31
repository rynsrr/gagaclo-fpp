import { PurchaseRequisition } from '@/types/purchase';

interface PurchaseSummaryProps {
  purchases: PurchaseRequisition[];
  userName?: string;
}

export default function PurchaseSummary({ purchases, userName = 'ALL' }: PurchaseSummaryProps) {
  const received = purchases.filter((purchase) =>
    Boolean(purchase.tanggalDiterima?.trim()) ||
    purchase.status === 'Diterima' || purchase.status === 'Selesai'
  ).length;

  const isFiltered = userName && userName !== 'ALL';

  const cards = [
    {
      label: isFiltered ? `Total (${userName})` : 'Total FPP',
      count: purchases.length,
      description: isFiltered ? `Milik ${userName}` : 'Total terdaftar',
    },
    {
      label: 'Belum Diterima',
      count: purchases.length - received,
      description: 'Menunggu proses',
    },
    {
      label: 'Sudah Diterima',
      count: received,
      description: 'Penerimaan selesai',
    },
  ];

  return (
    <aside aria-label="Ringkasan FPP" className="no-print min-w-0 grid grid-cols-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-x divide-slate-200 dark:divide-zinc-800 shadow-sm">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 p-2.5 sm:px-3.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
            {card.label}
          </div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {card.count}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
            {card.description}
          </div>
        </div>
      ))}
    </aside>
  );
}
