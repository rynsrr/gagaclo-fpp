'use client';

import React, { useState, useMemo } from 'react';
import { PurchaseRequisition, PurchaseJenis } from '@/types/purchase';
import { formatShortDate, deletePurchase } from '@/lib/purchaseService';
import {
  Plus,
  Edit3,
  Trash2,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
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

  // Statistics
  const stats = useMemo(() => {
    const totalCount = purchases.length;
    const receivedCount = purchases.filter((purchase) =>
      Boolean(purchase.tanggalDiterima?.trim()) ||
      purchase.status === 'Diterima' || purchase.status === 'Selesai'
    ).length;
    return { totalCount, receivedCount, pendingCount: totalCount - receivedCount };
  }, [purchases]);

  const handleDelete = async (id: string, nomor: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus formulir ${nomor}?`)) {
      setDeletingId(id);
      await deletePurchase(id);
      setDeletingId(null);
      onRefresh();
    }
  };

  const getJenisBadge = (jenis: PurchaseJenis) => {
    switch (jenis) {
      case 'Segera':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-900/40 text-red-300 border border-red-500/30">
            Segera
          </span>
        );
      case 'Non Rutin':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-900/40 text-amber-300 border border-amber-500/30">
            Non Rutin
          </span>
        );
      case 'Rutin':
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-900/40 text-blue-300 border border-blue-500/30">
            Rutin
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
            Total Permohonan
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Dokumen terdaftar</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold">
            Belum Diterima
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{stats.pendingCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Menunggu penerimaan</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">
            Sudah Diterima
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.receivedCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Penerimaan tercatat</div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {purchases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="text-zinc-400 text-sm">Tidak ada formulir permohonan yang sesuai.</div>
            <button
              onClick={onAddNew}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Formulir Baru Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/80">
                  <th className="py-3 px-4">Nomor FPP</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Jenis</th>
                  <th className="py-3 px-3">Ringkasan Barang</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {purchases.map((item) => {
                  const firstItem = item.items?.[0];
                  const remainingCount = (item.items?.length || 0) - 1;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition">
                      {/* Nomor */}
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        <button
                          onClick={() => onSelectForPreview(item)}
                          className="hover:text-blue-400 flex items-center space-x-1.5"
                          title="Klik untuk pratinjau cetak A4"
                        >
                          <span>{item.nomor || 'Draft'}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-500" />
                        </button>
                      </td>

                      {/* Tanggal */}
                      <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                        {formatShortDate(item.tanggal)}
                      </td>

                      {/* Jenis */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getJenisBadge(item.jenis)}
                      </td>

                      {/* Ringkasan Barang */}
                      <td className="py-3 px-3 max-w-[240px]">
                        {firstItem ? (
                          <div className="truncate text-zinc-200">
                            <span>{firstItem.namaBarang || 'Tanpa nama'}</span>
                            {remainingCount > 0 && (
                              <span className="text-[10px] text-zinc-500 ml-1.5 bg-zinc-800 px-1.5 py-0.5 rounded">
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
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          {/* Edit */}
                          <button
                            onClick={() => onSelectForEdit(item)}
                            className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-950/30 rounded-lg transition"
                            title="Edit Formulir"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(item.id, item.nomor)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition disabled:opacity-50"
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
