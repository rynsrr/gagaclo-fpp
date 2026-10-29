'use client';

import React, { useState, useMemo } from 'react';
import { PurchaseRequisition, PurchaseJenis } from '@/types/purchase';
import { deletePurchase } from '@/lib/purchaseService';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  FileText,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';

interface PurchaseListProps {
  purchases: PurchaseRequisition[];
  onSelectForEdit: (item: PurchaseRequisition) => void;
  onSelectForPreview: (item: PurchaseRequisition) => void;
  onAddNew: () => void;
  onRefresh: () => void;
}

export default function PurchaseList({
  purchases,
  onSelectForEdit,
  onSelectForPreview,
  onAddNew,
  onRefresh,
}: PurchaseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const filteredPurchases = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('id-ID');
    if (!query) return purchases;
    return purchases.filter((purchase) => [
      purchase.nomor, purchase.tanggal, purchase.jenis,
      purchase.dimintaOleh, purchase.uraianKeperluan,
      ...purchase.items.flatMap((item) => [item.namaBarang, item.supplier]),
    ].some((value) => value?.toLocaleLowerCase('id-ID').includes(query)));
  }, [purchases, searchQuery]);

  const handleDelete = async (id: string, nomor: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus formulir ${nomor}?`)) {
      setDeletingId(id);
      await deletePurchase(id);
      setDeletingId(null);
      onRefresh();
    }
  };

  const getJenisBadge = (jenis: PurchaseJenis) => {
    const labels = { Rutin: 'R', 'Non Rutin': 'NR', Segera: 'S', '': '—' };
    return <span title={jenis || 'Belum dipilih'} aria-label={jenis || 'Belum dipilih'} className="inline-block rounded border border-zinc-300 dark:border-zinc-700 px-1 py-0.5 font-normal">{labels[jenis]}</span>;
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Cari FPP"
          placeholder="Cari FPP, barang, supplier, pemohon..."
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>
      {/* TABLE */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="text-zinc-400 text-sm">Tidak ada formulir permohonan yang sesuai.</div>
            <button
              onClick={onAddNew}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Formulir Baru Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs text-zinc-700 dark:text-zinc-300">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '17%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-normal bg-zinc-100 dark:bg-zinc-950/80">
                  <th className="py-2 px-1.5">Nomor FPP</th>
                  <th className="py-2 px-1.5">Tanggal</th>
                  <th className="py-2 px-1.5">Jenis</th>
                  <th className="py-2 px-1.5">Barang</th>
                  <th className="py-2 px-1.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredPurchases.map((item) => {
                  const firstItem = item.items?.[0];
                  const remainingCount = (item.items?.length || 0) - 1;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition">
                      {/* Nomor */}
                      <td className="py-2 px-1.5 font-normal text-black dark:text-white whitespace-nowrap">
                        <button
                          onClick={() => onSelectForPreview(item)}
                          className="hover:text-blue-400 block w-full truncate text-left"
                          title="Klik untuk pratinjau cetak A4"
                        >
                          <span>{item.nomor || 'Draft'}</span>
                        </button>
                      </td>

                      {/* Tanggal */}
                      <td className="py-2 px-1.5 text-zinc-400 whitespace-nowrap">
                        {item.tanggal ? item.tanggal.slice(0, 10).split('-').reverse().map((part, index) => index === 2 ? part.slice(-2) : part).join('/') : '—'}
                      </td>

                      {/* Jenis */}
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        {getJenisBadge(item.jenis)}
                      </td>

                      {/* Ringkasan Barang */}
                      <td className="py-2 px-1.5 max-w-[240px]">
                        {firstItem ? (
                          <div className="truncate text-zinc-800 dark:text-zinc-200">
                            <span>{firstItem.namaBarang || 'Tanpa nama'}</span>
                            {remainingCount > 0 && (
                              <span className="text-[10px] text-zinc-500 ml-1">
                                +{remainingCount} lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">Belum ada item</span>
                        )}
                        {item.uraianKeperluan && (
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {item.uraianKeperluan}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-1.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-0.5">
                          {/* Edit */}
                          <button
                            onClick={() => onSelectForEdit(item)}
                            className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-blue-950/30 rounded-lg transition"
                            title="Edit Formulir"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(item.id, item.nomor)}
                            disabled={deletingId === item.id}
                            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition disabled:opacity-50"
                            title="Hapus Formulir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
