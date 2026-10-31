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
  Copy,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PurchaseListProps {
  purchases: PurchaseRequisition[];
  onSelectForEdit: (item: PurchaseRequisition) => void;
  onSelectForPreview: (item: PurchaseRequisition) => void;
  onAddNew: () => void;
  onRefresh: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  currentUser?: string | null;
  onDuplicate?: (item: PurchaseRequisition) => void;
  onDelete?: (id: string, nomor: string) => void;
  selectedUser?: string;
  onSelectUser?: (user: string) => void;
  availableUsers?: string[];
  userCounts?: Record<string, number>;
  totalAllPurchases?: number;
}

export default function PurchaseList({
  purchases,
  onSelectForEdit,
  onSelectForPreview,
  onAddNew,
  onRefresh,
  onDelete,
  onDuplicate,
  canEdit=true,
  canDelete=true,
  currentUser=null,
  selectedUser: propSelectedUser,
  onSelectUser: propOnSelectUser,
  availableUsers: propAvailableUsers,
  userCounts: propUserCounts,
  totalAllPurchases,
}: PurchaseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedUser, setLocalSelectedUser] = useState<string>('ALL');

  const selectedUser = propSelectedUser !== undefined ? propSelectedUser : localSelectedUser;
  const setSelectedUser = (user: string) => {
    if (propOnSelectUser) {
      propOnSelectUser(user);
    } else {
      setLocalSelectedUser(user);
    }
  };

  // Daftar akun peminta (standar + yang ada di data riwayat)
  const availableUsers = useMemo(() => {
    if (propAvailableUsers) return propAvailableUsers;
    const defaultUsers = ['Royan', 'Ryan', 'Ami', 'Hanami', 'Cynara'];
    const map = new Map<string, string>();

    defaultUsers.forEach((u) => map.set(u.toLowerCase(), u));

    purchases.forEach((p) => {
      const peminta = (p.dimintaOleh || '').trim();
      if (peminta) {
        const key = peminta.toLowerCase();
        if (!map.has(key)) {
          map.set(key, peminta.charAt(0).toUpperCase() + peminta.slice(1));
        }
      }
      if (p.nomor && p.nomor.includes('-')) {
        const prefix = p.nomor.split('-')[0].trim();
        if (prefix && prefix !== 'FPP') {
          const key = prefix.toLowerCase();
          if (!map.has(key)) {
            map.set(key, prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase());
          }
        }
      }
    });

    return Array.from(map.values());
  }, [purchases, propAvailableUsers]);

  // Hitung jumlah formulir per user
  const userCounts = useMemo(() => {
    if (propUserCounts) return propUserCounts;
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
  }, [availableUsers, purchases, propUserCounts]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      // 1. Filter per user
      if (selectedUser !== 'ALL') {
        const key = selectedUser.trim().toLowerCase();
        const peminta = (purchase.dimintaOleh || '').trim().toLowerCase();
        const nomor = (purchase.nomor || '').trim().toUpperCase();
        const matchesUser = peminta === key || nomor.startsWith(key.toUpperCase() + '-');
        if (!matchesUser) return false;
      }

      // 2. Filter kata kunci pencarian
      const query = searchQuery.trim().toLocaleLowerCase('id-ID');
      if (!query) return true;
      return [
        purchase.nomor,
        purchase.tanggal,
        purchase.jenis,
        purchase.dimintaOleh,
        purchase.uraianKeperluan,
        ...purchase.items.flatMap((item) => [item.namaBarang, item.supplier]),
      ].some((value) => value?.toLocaleLowerCase('id-ID').includes(query));
    });
  }, [purchases, selectedUser, searchQuery]);

  // Paginasi agar tabel tidak memanjang tanpa batas ke bawah
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset ke halaman 1 jika filter atau pencarian berubah
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUser]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredPurchases.length / pageSize) || 1;
  const paginatedPurchases = useMemo(() => {
    if (pageSize === 0) return filteredPurchases;
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage, pageSize]);

  const handleDelete = async (id: string, nomor: string) => {
    if (onDelete) {
      onDelete(id, nomor);
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus formulir ${nomor}?`)) {
      setDeletingId(id);
      const result = await deletePurchase(id);
      setDeletingId(null);
      if (!result.success) {
        alert('Penghapusan gagal. Data belum terhapus dari database.');
        return;
      }
      onRefresh();
    }
  };

  const getJenisBadge = (jenis: PurchaseJenis) => {
    const labels = { Rutin: 'R', 'Non Rutin': 'NR', Segera: 'S', '': '—' };
    return <span title={jenis || 'Belum dipilih'} aria-label={jenis || 'Belum dipilih'} className="inline-block rounded border border-zinc-300 dark:border-zinc-700 px-1 py-0.5 font-normal">{labels[jenis]}</span>;
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      {/* Search & User Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Cari FPP"
            placeholder="Cari FPP, barang, supplier, pemohon..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
        {/* Quick Select Dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            aria-label="Filter berdasarkan akun"
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 cursor-pointer"
          >
            <option value="ALL">Semua User ({totalAllPurchases !== undefined ? totalAllPurchases : purchases.length})</option>
            {availableUsers.map((user) => {
              const count = userCounts[user.toLowerCase()] || 0;
              return (
                <option key={user} value={user}>
                  {user} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {/* TABLE */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="text-zinc-400 text-sm">
              {selectedUser !== 'ALL'
                ? `Tidak ada formulir FPP untuk user ${selectedUser}.`
                : 'Tidak ada formulir permohonan yang sesuai.'}
            </div>
            {selectedUser !== 'ALL' ? (
              <button
                type="button"
                onClick={() => setSelectedUser('ALL')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tampilkan Semua User</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddNew}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Formulir Baru Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800">
            <table className="w-full table-fixed text-left text-xs text-zinc-700 dark:text-zinc-300">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '17%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-normal bg-zinc-100 dark:bg-zinc-950 sticky top-0 z-10 shadow-sm">
                  <th className="py-2 px-1.5">Nomor FPP</th>
                  <th className="py-2 px-1.5">Tanggal</th>
                  <th className="py-2 px-1.5">Jenis</th>
                  <th className="py-2 px-1.5">Barang</th>
                  <th className="py-2 px-1.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {paginatedPurchases.map((item) => {
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
                          {item.dimintaOleh && (
                            <span className="block text-[10px] text-zinc-500 font-normal truncate">
                              {item.dimintaOleh}
                            </span>
                          )}
                          {item.pendingSync && <span className="block text-[9px] text-amber-600">Belum tersinkron</span>}
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
                          {/* Actions: Edit vs View based on ownership */}
                          {(() => {
                            const isOwner = Boolean(
                              currentUser && (
                                (item.dimintaOleh || '').trim().toLowerCase() === currentUser.trim().toLowerCase() ||
                                (item.nomor || '').trim().toUpperCase().startsWith(currentUser.trim().toUpperCase() + '-')
                              )
                            );

                            return (
                              <>
                                {isOwner ? (
                                  <button
                                    disabled={!canEdit}
                                    onClick={() => onSelectForEdit(item)}
                                    className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-blue-950/30 rounded-lg transition"
                                    title="Edit Formulir Saya"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onSelectForEdit(item)}
                                    className="p-1 text-amber-500 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition"
                                    title={`Lihat Formulir ${item.nomor} milik ${item.dimintaOleh || 'akun lain'} (Hanya Baca)`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}

                                {onDuplicate && (
                                  <button
                                    type="button"
                                    onClick={() => onDuplicate(item)}
                                    className="p-1 text-zinc-400 hover:text-blue-500 rounded-lg"
                                    title={isOwner ? 'Duplikat FPP' : 'Salin ke Akun Saya'}
                                    aria-label={`Duplikat ${item.nomor}`}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                )}

                                {isOwner && (
                                  <button
                                    onClick={() => handleDelete(item.id, item.nomor)}
                                    disabled={!canDelete || deletingId === item.id}
                                    className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition disabled:opacity-50"
                                    title="Hapus Formulir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bar Kontrol Paginasi & Info Jumlah */}
          {filteredPurchases.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/80 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Jumlah baris per halaman"
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer focus:outline-none"
                >
                  <option value={5}>5 per hal</option>
                  <option value={10}>10 per hal</option>
                  <option value={20}>20 per hal</option>
                  <option value={0}>Semua</option>
                </select>
                <span className="hidden sm:inline text-zinc-400">
                  (Total {filteredPurchases.length} FPP)
                </span>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] mr-1">
                    Hal {currentPage} dari {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition"
                    title="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition"
                    title="Halaman berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
