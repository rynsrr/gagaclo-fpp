'use client';

import React, { useMemo, useState } from 'react';
import { PurchaseJenis, PurchaseRequisition } from '@/types/purchase';
import { formatRupiah, formatShortDate, getPurchaseReceiptStats } from '@/lib/purchaseService';
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Users,
  Wallet,
} from 'lucide-react';

interface PurchaseDashboardProps {
  purchases: PurchaseRequisition[];
  selectedUser: string;
  onSelectUser: (user: string) => void;
  availableUsers: string[];
  onOpenPurchase: (item: PurchaseRequisition) => void;
  onAddNew: () => void;
}

type PeriodFilter = 'ALL' | 'MONTH' | '30D';

function getPurchaseTotal(purchase: PurchaseRequisition): number {
  if (typeof purchase.totalTaksiran === 'number' && purchase.totalTaksiran > 0) {
    return purchase.totalTaksiran;
  }
  return (purchase.items || []).reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
}

function parsePurchaseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getOwnerLabel(purchase: PurchaseRequisition): string {
  const raw = (purchase.dimintaOleh || '').trim();
  if (raw) {
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  if (purchase.nomor && purchase.nomor.includes('-')) {
    const prefix = purchase.nomor.split('-')[0].trim();
    if (prefix && prefix !== 'FPP') {
      return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    }
  }
  return 'Lainnya';
}

export default function PurchaseDashboard({
  purchases,
  selectedUser,
  onSelectUser,
  availableUsers,
  onOpenPurchase,
  onAddNew,
}: PurchaseDashboardProps) {
  const [period, setPeriod] = useState<PeriodFilter>('ALL');

  const filteredPurchases = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

    return purchases.filter((p) => {
      if (selectedUser !== 'ALL') {
        const key = selectedUser.trim().toLowerCase();
        const peminta = (p.dimintaOleh || '').trim().toLowerCase();
        const nomor = (p.nomor || '').trim().toUpperCase();
        if (peminta !== key && !nomor.startsWith(key.toUpperCase() + '-')) {
          return false;
        }
      }

      if (period !== 'ALL') {
        const d = parsePurchaseDate(p.tanggal);
        if (!d) return false;
        if (period === 'MONTH') {
          if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
        } else if (period === '30D') {
          if (d < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [purchases, selectedUser, period]);

  const stats = useMemo(() => {
    let activeCount = 0;
    let receivedCount = 0;
    let partialCount = 0;
    let cancelledCount = 0;
    let totalAmount = 0;
    let totalItems = 0;
    let receivedItemsTotal = 0;

    const jenisMap: Record<PurchaseJenis, { count: number; amount: number }> = {
      Rutin: { count: 0, amount: 0 },
      'Non Rutin': { count: 0, amount: 0 },
      Segera: { count: 0, amount: 0 },
      '': { count: 0, amount: 0 },
    };

    const userMap = new Map<
      string,
      { name: string; total: number; received: number; partial: number; pending: number; cancelled: number; amount: number }
    >();

    const supplierMap = new Map<string, { name: string; count: number; amount: number }>();

    filteredPurchases.forEach((p) => {
      const receipt = getPurchaseReceiptStats(p);
      const amt = getPurchaseTotal(p);
      const owner = getOwnerLabel(p);
      const existingUser = userMap.get(owner) || {
        name: owner,
        total: 0,
        received: 0,
        partial: 0,
        pending: 0,
        cancelled: 0,
        amount: 0,
      };

      if (receipt.state === 'cancelled') {
        cancelledCount += 1;
        existingUser.cancelled += 1;
        userMap.set(owner, existingUser);
        return;
      }

      activeCount += 1;
      if (receipt.state === 'complete') receivedCount += 1;
      else if (receipt.state === 'partial') partialCount += 1;

      totalAmount += amt;
      totalItems += receipt.totalItems;
      receivedItemsTotal += receipt.receivedItems;

      const jenisKey: PurchaseJenis =
        p.jenis === 'Rutin' || p.jenis === 'Non Rutin' || p.jenis === 'Segera' ? p.jenis : '';
      jenisMap[jenisKey].count += 1;
      jenisMap[jenisKey].amount += amt;

      existingUser.total += 1;
      if (receipt.state === 'complete') existingUser.received += 1;
      else if (receipt.state === 'partial') existingUser.partial += 1;
      else existingUser.pending += 1;
      existingUser.amount += amt;
      userMap.set(owner, existingUser);

      (p.items || []).forEach((item) => {
        const sup = (item.supplier || '').trim();
        if (!sup) return;
        const supKey = sup.toLowerCase();
        const existingSup = supplierMap.get(supKey) || { name: sup, count: 0, amount: 0 };
        existingSup.count += 1;
        existingSup.amount += Number(item.jumlah) || 0;
        supplierMap.set(supKey, existingSup);
      });
    });

    const pendingCount = Math.max(0, activeCount - receivedCount - partialCount);
    const completionRate = activeCount > 0 ? Math.round((receivedCount / activeCount) * 100) : 0;

    const jenisRows: Array<{ label: string; key: PurchaseJenis; count: number; amount: number; pct: number }> = (
      ['Rutin', 'Non Rutin', 'Segera', ''] as PurchaseJenis[]
    )
      .map((key) => ({
        key,
        label: key || 'Belum Dipilih',
        count: jenisMap[key].count,
        amount: jenisMap[key].amount,
        pct: activeCount > 0 ? Math.round((jenisMap[key].count / activeCount) * 100) : 0,
      }))
      .filter((row) => row.key !== '' || row.count > 0);

    const byUser = Array.from(userMap.values()).sort((a, b) => b.total - a.total || b.amount - a.amount);
    const topSuppliers = Array.from(supplierMap.values())
      .sort((a, b) => b.count - a.count || b.amount - a.amount)
      .slice(0, 5);

    const recent = [...filteredPurchases]
      .sort((a, b) => {
        const da = (b.tanggal || b.updatedAt || '').localeCompare(a.tanggal || a.updatedAt || '');
        if (da !== 0) return da;
        return (b.nomor || '').localeCompare(a.nomor || '');
      })
      .slice(0, 6);

    return {
      totalCount: activeCount,
      receivedCount,
      partialCount,
      pendingCount,
      cancelledCount,
      completionRate,
      totalAmount,
      totalItems,
      receivedItemsTotal,
      jenisRows,
      byUser,
      topSuppliers,
      recent,
    };
  }, [filteredPurchases]);

  const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
    { value: 'ALL', label: 'Semua' },
    { value: 'MONTH', label: 'Bulan Ini' },
    { value: '30D', label: '30 Hari' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard FPP
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Ringkasan permohonan pembelian PT Gagaclo berdasarkan data tersimpan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Segmented Control */}
          <div
            role="group"
            aria-label="Filter periode"
            className="inline-flex rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 p-1"
          >
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition ${
                  period === opt.value
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* User Filter */}
          <select
            value={selectedUser}
            onChange={(e) => onSelectUser(e.target.value)}
            aria-label="Filter pemohon"
            className="min-h-[44px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:border-slate-400 dark:focus:border-zinc-600 focus:outline-none"
          >
            <option value="ALL">Semua Pemohon</option>
            {availableUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredPurchases.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-12 text-center space-y-3 shadow-sm">
          <FileText className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" aria-hidden="true" />
          <div className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
            Belum ada data FPP untuk filter ini
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            Ubah filter periode atau pemohon, atau buat formulir permohonan pembelian baru.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {(selectedUser !== 'ALL' || period !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  onSelectUser('ALL');
                  setPeriod('ALL');
                }}
                className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={onAddNew}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Buat FPP Baru</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">FPP Aktif</span>
                <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.totalCount}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {stats.receivedItemsTotal}/{stats.totalItems} barang diterima
                {stats.cancelledCount > 0 ? ` • ${stats.cancelledCount} batal` : ''}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Taksiran</span>
                <Wallet className="w-4 h-4 shrink-0" aria-hidden="true" />
              </div>
              <div className="mt-2 text-lg sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white break-words">
                {formatRupiah(stats.totalAmount)}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Akumulasi FPP aktif
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Belum / Parsial</span>
                <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.pendingCount + stats.partialCount}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {stats.partialCount > 0
                  ? `${stats.partialCount} diterima sebagian`
                  : 'Menunggu penerimaan'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Sudah Diterima</span>
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.receivedCount}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {stats.completionRate}% selesai diterima
              </div>
            </div>
          </div>

          {/* Middle Row: Jenis Distribution + Rekap Pemohon */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Distribusi Jenis Permohonan */}
            <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Distribusi Jenis Permohonan
              </h2>
              <div className="space-y-3.5">
                {stats.jenisRows.map((row) => (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-zinc-200">
                        {row.label}
                      </span>
                      <span className="tabular-nums text-slate-600 dark:text-zinc-400">
                        <strong className="text-slate-900 dark:text-white">{row.count}</strong> ({row.pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.key === 'Segera'
                            ? 'bg-red-600 dark:bg-red-500'
                            : row.key === 'Non Rutin'
                            ? 'bg-amber-500 dark:bg-amber-400'
                            : 'bg-slate-900 dark:bg-zinc-200'
                        }`}
                        style={{ width: `${Math.max(row.pct, row.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <div className="text-[11px] tabular-nums text-slate-500 dark:text-zinc-400">
                      Taksiran: {formatRupiah(row.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Rekap per Pemohon */}
            <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500 dark:text-zinc-400" aria-hidden="true" />
                  <span>Rekap per Pemohon</span>
                </h2>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {stats.byUser.length} pemohon
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {stats.byUser.map((u) => (
                  <button
                    key={u.name}
                    type="button"
                    onClick={() => onSelectUser(selectedUser === u.name ? 'ALL' : u.name)}
                    className="w-full min-h-[52px] py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 flex items-center justify-between gap-3 text-left transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                          {u.received} diterima
                          {u.partial > 0 ? ` • ${u.partial} parsial` : ''} &bull; {u.pending} menunggu
                          {u.cancelled > 0 ? ` • ${u.cancelled} batal` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        {u.total} FPP
                      </div>
                      <div className="text-[11px] tabular-nums text-slate-500 dark:text-zinc-400">
                        {formatRupiah(u.amount)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Bottom Row: Top Suppliers + Recent FPP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Top Suppliers */}
            <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500 dark:text-zinc-400" aria-hidden="true" />
                <span>Supplier Terbanyak</span>
              </h2>

              {stats.topSuppliers.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-zinc-400 py-4">
                  Belum ada data supplier pada item FPP.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {stats.topSuppliers.map((sup, idx) => (
                    <div
                      key={sup.name}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-200 truncate">
                          {sup.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                          {sup.count} item
                        </div>
                        {sup.amount > 0 && (
                          <div className="text-[11px] tabular-nums text-slate-500 dark:text-zinc-400">
                            {formatRupiah(sup.amount)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Aktivitas FPP Terbaru */}
            <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                FPP Terbaru
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {stats.recent.map((item) => {
                  const receipt = getPurchaseReceiptStats(item);
                  const firstItem = item.items?.[0]?.namaBarang || 'Tanpa nama barang';
                  const extraCount = Math.max(0, (item.items?.length || 0) - 1);
                  const statusBadge =
                    receipt.state === 'cancelled'
                      ? {
                          label: 'Dibatalkan',
                          className: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300',
                        }
                      : receipt.state === 'complete'
                      ? {
                          label: 'Diterima',
                          className: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
                        }
                      : receipt.state === 'partial'
                      ? {
                          label: `${receipt.receivedItems}/${receipt.totalItems} Diterima`,
                          className: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300',
                        }
                      : {
                          label: 'Menunggu',
                          className: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
                        };
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenPurchase(item)}
                      className="w-full min-h-[56px] py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 flex items-center justify-between gap-3 text-left transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono text-xs sm:text-sm font-semibold ${receipt.state === 'cancelled' ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-white'}`}>
                            {item.nomor || 'Draft'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                            {item.tanggal ? formatShortDate(item.tanggal) : '-'}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-zinc-400 truncate mt-0.5">
                          {firstItem}
                          {extraCount > 0 ? ` (+${extraCount} lainnya)` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                            {formatRupiah(getPurchaseTotal(item))}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                            {getOwnerLabel(item)}
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
