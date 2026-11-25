'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PurchaseItem, PurchaseJenis, PurchaseRequisition } from '@/types/purchase';
import { calculateItemAmount, formatRupiah, getPurchaseReceiptStats, todayInJakarta } from '@/lib/purchaseService';
import {
  findMasterItem,
  getAllSuppliers,
  getAllUnits,
  getMasterItems,
  MasterItem,
  recordMasterItem,
} from '@/lib/itemCatalogService';
import AttachmentPanel from './AttachmentPanel';
import {
  Ban,
  Check,
  CheckCircle2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

interface MobilePurchaseEditorProps {
  data: PurchaseRequisition;
  onChange: (updated: PurchaseRequisition) => void;
  onGenerateNomor?: () => void;
  onToggleCancel?: () => void;
  saveNotice?: string | null;
  isEditable: boolean;
  currentUser?: string | null;
}

const JENIS_OPTIONS: PurchaseJenis[] = ['Rutin', 'Non Rutin', 'Segera'];

function parseQtySatuan(banyaknya?: string, qty?: number, satuan?: string) {
  const cleanBanyaknya = String(banyaknya || '').trim();
  const match = cleanBanyaknya.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);

  let q = '';
  if (qty !== undefined && qty !== null && !Number.isNaN(qty)) {
    q = String(qty);
  } else if (match) {
    q = match[1];
  }

  let s = '';
  if (satuan !== undefined && satuan !== null && satuan !== '') {
    s = satuan;
  } else if (match) {
    s = match[2];
  } else if (cleanBanyaknya && !match) {
    s = cleanBanyaknya;
  }

  return { qty: q, satuan: s };
}

function calculateTotal(items: PurchaseItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
}

export default function MobilePurchaseEditor({
  data,
  onChange,
  onGenerateNomor,
  onToggleCancel,
  saveNotice = null,
  isEditable,
  currentUser = null,
}: MobilePurchaseEditorProps) {
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [catalog, setCatalog] = useState<MasterItem[]>(() => getMasterItems());
  const [autoFilledIndex, setAutoFilledIndex] = useState<number | null>(null);

  useEffect(() => {
    const refreshCatalog = () => setCatalog(getMasterItems());
    refreshCatalog();
    if (typeof window !== 'undefined') {
      window.addEventListener('fpp-catalog-updated', refreshCatalog);
      return () => window.removeEventListener('fpp-catalog-updated', refreshCatalog);
    }
  }, []);

  const allSuppliers = useMemo(() => getAllSuppliers(catalog), [catalog]);
  const allUnits = useMemo(() => getAllUnits(catalog), [catalog]);

  const updateField = <K extends keyof PurchaseRequisition>(
    field: K,
    value: PurchaseRequisition[K]
  ) => {
    if (!isEditable) return;
    onChange({
      ...dataRef.current,
      [field]: value,
    });
  };

  const handleItemNameChange = (index: number, newName: string) => {
    if (!isEditable) return;
    const current = dataRef.current;
    const updatedItems = [...current.items];
    const targetItem = { ...updatedItems[index], namaBarang: newName };

    const match = findMasterItem(newName, catalog);
    if (match) {
      const { qty: curQty } = parseQtySatuan(
        targetItem.banyaknya,
        targetItem.qty,
        targetItem.satuan
      );
      const matchSatuan = match.satuan || '';

      if (matchSatuan) {
        targetItem.satuan = matchSatuan;
        targetItem.banyaknya = curQty ? `${curQty} ${matchSatuan}`.trim() : matchSatuan;
      }
      if (match.hargaSatuan && match.hargaSatuan > 0) {
        targetItem.hargaSatuan = match.hargaSatuan;
      }
      if (match.supplier) {
        targetItem.supplier = match.supplier;
      }
      targetItem.jumlah = calculateItemAmount(
        String(targetItem.banyaknya || ''),
        targetItem.hargaSatuan || 0
      );

      setAutoFilledIndex(index);
      window.setTimeout(() => setAutoFilledIndex(null), 2500);
    }

    updatedItems[index] = targetItem;
    onChange({
      ...current,
      items: updatedItems,
      totalTaksiran: calculateTotal(updatedItems),
    });
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    if (!isEditable) return;
    const current = dataRef.current;
    const updatedItems = [...current.items];
    const targetItem = { ...updatedItems[index], [field]: value };

    if (field === 'hargaSatuan' || field === 'banyaknya') {
      const harga =
        field === 'hargaSatuan' ? Number(value) || 0 : targetItem.hargaSatuan || 0;
      targetItem.jumlah = calculateItemAmount(String(targetItem.banyaknya || ''), harga);
    }

    updatedItems[index] = targetItem;
    onChange({
      ...current,
      items: updatedItems,
      totalTaksiran: calculateTotal(updatedItems),
    });
  };

  const handleQtySatuanChange = (index: number, nextQty: string, nextSatuan: string) => {
    if (!isEditable) return;
    const current = dataRef.current;
    const updatedItems = [...current.items];
    const item = { ...updatedItems[index] };

    const cleanQty = String(nextQty || '').trim();
    const cleanSat = String(nextSatuan || '').trim();
    const combined = cleanQty
      ? cleanSat
        ? `${cleanQty} ${cleanSat}`
        : cleanQty
      : cleanSat;
    const numQty = cleanQty === '' ? undefined : Number(cleanQty.replace(',', '.'));

    item.banyaknya = combined;
    item.qty = Number.isFinite(numQty) ? numQty : undefined;
    item.satuan = cleanSat;
    item.jumlah = calculateItemAmount(combined, item.hargaSatuan || 0);

    updatedItems[index] = item;
    onChange({
      ...current,
      items: updatedItems,
      totalTaksiran: calculateTotal(updatedItems),
    });
  };

  const handleItemRowBlur = (index: number) => {
    const item = dataRef.current.items[index];
    if (item && item.namaBarang && item.namaBarang.trim()) {
      const { satuan } = parseQtySatuan(item.banyaknya, item.qty, item.satuan);
      recordMasterItem({
        namaBarang: item.namaBarang,
        satuan,
        hargaSatuan: item.hargaSatuan,
        supplier: item.supplier,
      });
    }
  };

  const handleAddItemRow = () => {
    if (!isEditable) return;
    const current = dataRef.current;
    const newItem: PurchaseItem = {
      id: 'item-' + Date.now() + '-' + (current.items.length + 1),
      no: current.items.length + 1,
      namaBarang: '',
      banyaknya: '',
      hargaSatuan: 0,
      jumlah: 0,
      supplier: '',
    };
    const updated = [...current.items, newItem];
    onChange({
      ...current,
      items: updated,
      totalTaksiran: calculateTotal(updated),
    });
  };

  const handleRemoveItemRow = (index: number) => {
    if (!isEditable) return;
    const current = dataRef.current;
    if (current.items.length <= 1) {
      onChange({
        ...current,
        items: [
          {
            id: 'item-1',
            no: 1,
            namaBarang: '',
            banyaknya: '',
            hargaSatuan: 0,
            jumlah: 0,
            supplier: '',
          },
        ],
        totalTaksiran: 0,
      });
      return;
    }
    const updated = current.items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, no: idx + 1 }));
    onChange({
      ...current,
      items: updated,
      totalTaksiran: calculateTotal(updated),
    });
  };

  const handleToggleItemReceived = (index: number) => {
    if (!isEditable) return;
    const current = dataRef.current;
    const updatedItems = [...current.items];
    const nextReceived = !updatedItems[index]?.diterima;
    updatedItems[index] = {
      ...updatedItems[index],
      diterima: nextReceived,
      tanggalDiterimaItem: nextReceived ? todayInJakarta() : '',
    };

    const named = updatedItems.filter((it) => Boolean(it.namaBarang?.trim()));
    const tracked = named.length > 0 ? named : updatedItems;
    const allReceived = tracked.length > 0 && tracked.every((it) => Boolean(it.diterima));
    const nextTanggalDiterima = allReceived
      ? current.tanggalDiterima || todayInJakarta()
      : nextReceived
      ? current.tanggalDiterima
      : '';

    onChange({
      ...current,
      items: updatedItems,
      tanggalDiterima: nextTanggalDiterima,
    });
  };

  const items = data.items || [];
  const photos = data.photos || [];
  const isCancelled = data.status === 'Dibatalkan';
  const receiptStats = getPurchaseReceiptStats(data);
  const inputClass =
    'w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-slate-900 dark:focus:border-zinc-400 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-zinc-900 disabled:text-slate-600 dark:disabled:text-zinc-400 transition';
  const labelClass =
    'block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5';

  return (
    <div className="w-full space-y-4">
      <datalist id="mobile-fpp-item-options">
        {catalog.map((c) => (
          <option key={c.namaBarang} value={c.namaBarang}>
            {[
              c.satuan || null,
              c.hargaSatuan ? formatRupiah(c.hargaSatuan) : null,
              c.supplier || null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </option>
        ))}
      </datalist>
      <datalist id="mobile-fpp-supplier-options">
        {allSuppliers.map((sup) => (
          <option key={sup} value={sup} />
        ))}
      </datalist>
      <datalist id="mobile-fpp-unit-options">
        {allUnits.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      {saveNotice && (
        <div
          role="status"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 text-xs font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{saveNotice}</span>
        </div>
      )}

      {isCancelled && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Ban className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
            <span className="font-medium">Formulir ini berstatus <strong>Dibatalkan</strong>.</span>
          </div>
          {isEditable && onToggleCancel && (
            <button
              type="button"
              onClick={onToggleCancel}
              className="min-h-[36px] px-3 rounded-lg bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-semibold shrink-0 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Aktifkan</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Informasi Dokumen */}
      <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            1. Informasi Dokumen
          </h2>
          {isEditable && onToggleCancel && !isCancelled && (
            <button
              type="button"
              onClick={onToggleCancel}
              className="min-h-[36px] px-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[11px] font-semibold inline-flex items-center gap-1 active:scale-95 transition"
            >
              <Ban className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cancel FPP</span>
            </button>
          )}
        </div>

        {/* Jenis Permohonan */}
        <div>
          <span className={labelClass}>Jenis Permohonan</span>
          <div
            role="radiogroup"
            aria-label="Jenis Permohonan"
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800"
          >
            {JENIS_OPTIONS.map((opt) => {
              const selected = data.jenis === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!isEditable}
                  onClick={() => updateField('jenis', opt)}
                  className={`min-h-[44px] rounded-lg text-xs font-semibold transition active:scale-[0.98] ${
                    selected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nomor & Tanggal */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="mobile-fpp-nomor" className={labelClass}>
              Nomor FPP
            </label>
            <div className="flex gap-2">
              <input
                id="mobile-fpp-nomor"
                type="text"
                disabled={!isEditable}
                value={data.nomor || ''}
                onChange={(e) => updateField('nomor', e.target.value)}
                placeholder={currentUser ? `${currentUser.toUpperCase()}-0001` : 'ROYAN-0001'}
                className={`${inputClass} font-mono font-semibold flex-1 min-w-0`}
              />
              {isEditable && onGenerateNomor && (
                <button
                  type="button"
                  onClick={onGenerateNomor}
                  aria-label="Generate nomor urut berikutnya"
                  title="Generate nomor urut berikutnya"
                  className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center shrink-0 active:scale-95 transition"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="mobile-fpp-tanggal" className={labelClass}>
              Tanggal Pengajuan
            </label>
            <input
              id="mobile-fpp-tanggal"
              type="date"
              disabled={!isEditable}
              value={data.tanggal || ''}
              onChange={(e) => updateField('tanggal', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* 2. Daftar Barang */}
      <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              2. Daftar Barang ({items.length})
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Diterima: <strong className="text-slate-800 dark:text-zinc-200">{receiptStats.receivedItems}/{receiptStats.totalItems}</strong> barang
            </p>
          </div>
          <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(data.totalTaksiran || 0)}
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const parsed = parseQtySatuan(item.banyaknya, item.qty, item.satuan);
            const itemReceived = Boolean(item.diterima);
            return (
              <div
                key={item.id || idx}
                className={`rounded-xl border p-3 space-y-3 transition ${
                  itemReceived
                    ? 'border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-200 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 shrink-0">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={itemReceived}
                      disabled={!isEditable}
                      onClick={() => handleToggleItemReceived(idx)}
                      className={`min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition active:scale-95 disabled:opacity-70 ${
                        itemReceived
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          itemReceived
                            ? 'border-white/70 bg-white/20'
                            : 'border-slate-400 dark:border-zinc-500'
                        }`}
                      >
                        {itemReceived && <Check className="w-3 h-3" aria-hidden="true" />}
                      </span>
                      <span>{itemReceived ? 'Sudah Diterima' : 'Belum Diterima'}</span>
                    </button>
                    {autoFilledIndex === idx && (
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
                        Katalog dimuat
                      </span>
                    )}
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      aria-label={`Hapus item ${idx + 1}`}
                      className="min-h-[44px] min-w-[44px] -my-2 -mr-2 flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Nama Barang */}
                <div>
                  <label htmlFor={`mobile-item-name-${idx}`} className={labelClass}>
                    Nama Barang
                  </label>
                  <input
                    id={`mobile-item-name-${idx}`}
                    type="text"
                    list="mobile-fpp-item-options"
                    disabled={!isEditable}
                    value={item.namaBarang}
                    onChange={(e) => handleItemNameChange(idx, e.target.value)}
                    onBlur={() => handleItemRowBlur(idx)}
                    placeholder="Ketik nama barang..."
                    className={inputClass}
                  />
                </div>

                {/* Qty & Satuan */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor={`mobile-item-qty-${idx}`} className={labelClass}>
                      Jumlah (Qty)
                    </label>
                    <input
                      id={`mobile-item-qty-${idx}`}
                      type="text"
                      inputMode="decimal"
                      disabled={!isEditable}
                      value={parsed.qty}
                      onChange={(e) =>
                        handleQtySatuanChange(idx, e.target.value, parsed.satuan)
                      }
                      placeholder="0"
                      className={`${inputClass} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`mobile-item-unit-${idx}`} className={labelClass}>
                      Satuan
                    </label>
                    <input
                      id={`mobile-item-unit-${idx}`}
                      type="text"
                      list="mobile-fpp-unit-options"
                      disabled={!isEditable}
                      value={parsed.satuan}
                      onChange={(e) =>
                        handleQtySatuanChange(idx, parsed.qty, e.target.value)
                      }
                      onBlur={() => handleItemRowBlur(idx)}
                      placeholder="Pcs, Roll, Box"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Harga Satuan & Jumlah */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor={`mobile-item-price-${idx}`} className={labelClass}>
                      Harga Satuan (Rp)
                    </label>
                    <input
                      id={`mobile-item-price-${idx}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      disabled={!isEditable}
                      value={item.hargaSatuan === 0 ? '' : item.hargaSatuan}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'hargaSatuan',
                          e.target.value === '' ? 0 : Number(e.target.value)
                        )
                      }
                      onBlur={() => handleItemRowBlur(idx)}
                      placeholder="0"
                      className={`${inputClass} text-right tabular-nums`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`mobile-item-total-${idx}`} className={labelClass}>
                      Taksiran Jumlah (Rp)
                    </label>
                    <input
                      id={`mobile-item-total-${idx}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      disabled={!isEditable}
                      value={item.jumlah === 0 ? '' : item.jumlah}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'jumlah',
                          e.target.value === '' ? 0 : Number(e.target.value)
                        )
                      }
                      placeholder="0"
                      className={`${inputClass} text-right font-semibold tabular-nums`}
                    />
                  </div>
                </div>

                {/* Supplier */}
                <div>
                  <label htmlFor={`mobile-item-supplier-${idx}`} className={labelClass}>
                    Supplier
                  </label>
                  <input
                    id={`mobile-item-supplier-${idx}`}
                    type="text"
                    list="mobile-fpp-supplier-options"
                    disabled={!isEditable}
                    value={item.supplier}
                    onChange={(e) => handleItemChange(idx, 'supplier', e.target.value)}
                    onBlur={() => handleItemRowBlur(idx)}
                    placeholder="Nama supplier rekomendasi..."
                    className={inputClass}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {isEditable && (
          <button
            type="button"
            onClick={handleAddItemRow}
            className="w-full min-h-[48px] rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Tambah Baris Barang</span>
          </button>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-zinc-800">
          <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
            Total Taksiran ({items.length} item)
          </span>
          <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(data.totalTaksiran || 0)}
          </span>
        </div>
      </section>

      {/* 3. Uraian Keperluan & Catatan */}
      <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          3. Uraian &amp; Catatan
        </h2>

        <div>
          <label htmlFor="mobile-fpp-uraian" className={labelClass}>
            Uraian Keperluan
          </label>
          <textarea
            id="mobile-fpp-uraian"
            rows={3}
            disabled={!isEditable}
            value={data.uraianKeperluan || ''}
            onChange={(e) => updateField('uraianKeperluan', e.target.value)}
            placeholder="Ketik uraian keperluan pengadaan barang..."
            className={`${inputClass} min-h-[88px] resize-y leading-relaxed`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="mobile-fpp-tgl-diterima" className="text-xs font-medium text-slate-600 dark:text-zinc-400">
              Tanggal Diterima
            </label>
            {isEditable && data.tanggalDiterima && (
              <button
                type="button"
                onClick={() => updateField('tanggalDiterima', '')}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 py-1 px-2 -my-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>
          <input
            id="mobile-fpp-tgl-diterima"
            type="date"
            disabled={!isEditable}
            value={data.tanggalDiterima || ''}
            onChange={(e) => updateField('tanggalDiterima', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="mobile-fpp-catatan" className={labelClass}>
            Catatan Tambahan
          </label>
          <textarea
            id="mobile-fpp-catatan"
            rows={2}
            disabled={!isEditable}
            value={data.catatan || ''}
            onChange={(e) => updateField('catatan', e.target.value)}
            placeholder="Catatan tambahan (opsional)..."
            className={`${inputClass} min-h-[72px] resize-y leading-relaxed`}
          />
        </div>
      </section>

      {/* 4. Pengesahan */}
      <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          4. Pengesahan
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mobile-fpp-diminta" className={labelClass}>
              Diminta
            </label>
            <input
              id="mobile-fpp-diminta"
              type="text"
              disabled={!isEditable}
              value={data.dimintaOleh || ''}
              onChange={(e) => updateField('dimintaOleh', e.target.value)}
              placeholder={currentUser || 'Royan'}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="mobile-fpp-diterima" className={labelClass}>
              Diterima
            </label>
            <input
              id="mobile-fpp-diterima"
              type="text"
              disabled={!isEditable}
              value={data.diterimaOleh || ''}
              onChange={(e) => updateField('diterimaOleh', e.target.value)}
              placeholder="Nama..."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="mobile-fpp-diketahui" className={labelClass}>
              Diketahui
            </label>
            <input
              id="mobile-fpp-diketahui"
              type="text"
              disabled={!isEditable}
              value={data.diketahuiOleh || ''}
              onChange={(e) => updateField('diketahuiOleh', e.target.value)}
              placeholder="Nama..."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="mobile-fpp-disetujui" className={labelClass}>
              Disetujui
            </label>
            <input
              id="mobile-fpp-disetujui"
              type="text"
              disabled={!isEditable}
              value={data.disetujuiOleh || ''}
              onChange={(e) => updateField('disetujuiOleh', e.target.value)}
              placeholder="Nama..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* 5. Lampiran */}
      <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            5. Lampiran ({photos.length}/6)
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            Foto atau PDF
          </span>
        </div>

        <AttachmentPanel
          photos={photos}
          isEditable={isEditable}
          onChange={(next) => updateField('photos', next)}
          compactMobile
        />
      </section>
    </div>
  );
}
