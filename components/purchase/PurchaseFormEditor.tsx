'use client';

import React, { useState } from 'react';
import { PurchaseRequisition, PurchaseItem, PurchaseJenis, DEFAULT_PURCHASE_REQUISITION } from '@/types/purchase';
import {
  formatRupiah,
  savePurchase,
  generateNextNomor,
  SAMPLE_PURCHASE_REQUISITION,
} from '@/lib/purchaseService';
import { SIGNATURE_ROYAN_SRC } from '@/lib/logoData';
import {
  Plus,
  Trash2,
  Save,
  Printer,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Hash,
} from 'lucide-react';

interface PurchaseFormEditorProps {
  initialData?: PurchaseRequisition;
  allPurchases: PurchaseRequisition[];
  onSaved: (item: PurchaseRequisition) => void;
  onPreview: (item: PurchaseRequisition) => void;
}

export default function PurchaseFormEditor({
  initialData,
  allPurchases,
  onSaved,
  onPreview,
}: PurchaseFormEditorProps) {
  const [formData, setFormData] = useState<PurchaseRequisition>(() => {
    if (initialData && initialData.id) return initialData;
    return {
      ...DEFAULT_PURCHASE_REQUISITION,
      id: 'fpp-' + Date.now(),
      nomor: '',
      tanggal: new Date().toISOString().split('T')[0],
      dimintaTanggal: '',
      dimintaOleh: 'ROYAN - RDI',
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Recalculate total taksiran whenever items change
  const calculateTotal = (items: PurchaseItem[]): number => {
    return items.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const updatedItems = [...formData.items];
    const targetItem = { ...updatedItems[index], [field]: value };

    // Auto-calculate 'jumlah' if hargaSatuan or banyaknya contains numeric qty
    if (field === 'hargaSatuan' || field === 'banyaknya') {
      const harga = field === 'hargaSatuan' ? Number(value) || 0 : targetItem.hargaSatuan || 0;
      
      // Try to extract numeric quantity from banyaknya (e.g. "10 Pcs" -> 10)
      const qtyMatch = String(targetItem.banyaknya || '').match(/^(\d+(?:[.,]\d+)?)/);
      if (qtyMatch) {
        const qtyNum = parseFloat(qtyMatch[1].replace(',', '.'));
        if (!isNaN(qtyNum) && qtyNum > 0 && harga > 0) {
          targetItem.jumlah = Math.round(qtyNum * harga);
        }
      }
    }

    updatedItems[index] = targetItem;
    const newTotal = calculateTotal(updatedItems);
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
      totalTaksiran: newTotal,
    }));
  };

  const addItemRow = () => {
    const newItem: PurchaseItem = {
      id: 'item-' + Date.now() + '-' + (formData.items.length + 1),
      no: formData.items.length + 1,
      namaBarang: '',
      banyaknya: '',
      hargaSatuan: 0,
      jumlah: 0,
      supplier: '',
    };
    const updated = [...formData.items, newItem];
    setFormData((prev) => ({
      ...prev,
      items: updated,
      totalTaksiran: calculateTotal(updated),
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length <= 1) {
      alert('Minimal harus ada 1 baris barang pada formulir.');
      return;
    }
    const updated = formData.items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, no: idx + 1 }));
    setFormData((prev) => ({
      ...prev,
      items: updated,
      totalTaksiran: calculateTotal(updated),
    }));
  };

  const handleGenerateNewNomor = () => {
    const nextNomor = generateNextNomor(allPurchases);
    setFormData((prev) => ({ ...prev, nomor: nextNomor }));
  };

  const handleLoadSample = () => {
    if (confirm('Muat contoh data PT Gagaclo? Data formulir saat ini akan digantikan.')) {
      setFormData({
        ...SAMPLE_PURCHASE_REQUISITION,
        id: 'fpp-' + Date.now(),
        nomor: '',
      });
    }
  };

  const handleReset = () => {
    if (confirm('Kosongkan semua isian formulir?')) {
      setFormData({
        ...DEFAULT_PURCHASE_REQUISITION,
        id: 'fpp-' + Date.now(),
        nomor: '',
        tanggal: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (formData.items.every((it) => !it.namaBarang.trim())) {
      alert('Mohon masukkan minimal satu nama barang.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessNotice(null);

    const result = await savePurchase(formData);
    setIsSaving(false);

    if (result.success) {
      const destination = result.fromCloud ? 'Supabase Cloud Database & Penyimpanan Lokal' : 'Penyimpanan Lokal (Browser Storage)';
      setSaveSuccessNotice(`Formulir berhasil disimpan ke ${destination}!`);
      onSaved(formData);
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } else {
      alert('Gagal menyimpan formulir.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Editor Formulir Permohonan Pembelian</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            PT Gagaclo • Isi formulir, kalkulasi otomatis, dan cetak persis dokumen fisik A4
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition"
            title="Muat data sampel kain, benang, dan jarum PT Gagaclo"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Contoh Data</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-medium rounded-lg border border-zinc-700 transition"
            title="Reset Formulir"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => onPreview(formData)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Lihat Cetak A4</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan FPP'}</span>
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm rounded-xl animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* FORM CARD */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: HEADER INFORMASI PERMOHONAN */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              1. Informasi Dokumen
            </span>
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full border border-zinc-700">
              Format Standard PT Gagaclo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nomor FPP (Boleh dikosongkan) */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Nomor Formulir (Boleh Kosong)</span>
                <button
                  type="button"
                  onClick={handleGenerateNewNomor}
                  className="text-[10px] text-blue-400 hover:underline"
                >
                  Auto-Gen
                </button>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={formData.nomor}
                  onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                  placeholder="(Boleh dikosongkan)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Tanggal Pengajuan */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Tanggal Pengajuan
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Jenis Permohonan */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Jenis Permohonan (Lingkar salah satu)
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                {(['Rutin', 'Non Rutin', 'Segera'] as PurchaseJenis[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis: type })}
                    className={`py-1.5 text-xs font-medium rounded-lg transition ${
                      formData.jenis === type
                        ? 'bg-blue-600 text-white font-bold shadow'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DAFTAR BARANG (ITEMS TABLE) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                2. Daftar Barang & Taksiran Harga
              </span>
              <p className="text-xs text-zinc-500">
                Input kuantitas, estimasi harga satuan, dan supplier rekomendasi
              </p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/60">
                  <th className="py-2.5 px-2 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Nama Barang *</th>
                  <th className="py-2.5 px-3 w-32">Banyaknya</th>
                  <th className="py-2.5 px-3 w-36">Harga Satuan (Rp)</th>
                  <th className="py-2.5 px-3 w-36">Jumlah (Rp)</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Supplier</th>
                  <th className="py-2.5 px-2 w-10 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {formData.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-zinc-800/30 transition">
                    <td className="py-2 px-2 text-center text-zinc-500 font-medium">
                      {idx + 1}
                    </td>

                    {/* Nama Barang */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        required
                        value={item.namaBarang}
                        onChange={(e) => handleItemChange(idx, 'namaBarang', e.target.value)}
                        placeholder="e.g. Kain Katun 30s Hitam"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Banyaknya (Qty + Satuan) */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.banyaknya}
                        onChange={(e) => handleItemChange(idx, 'banyaknya', e.target.value)}
                        placeholder="e.g. 5 Roll / 10 Box"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Harga Satuan */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.hargaSatuan === 0 ? '' : item.hargaSatuan}
                        onChange={(e) => handleItemChange(idx, 'hargaSatuan', Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white text-right placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Jumlah */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.jumlah === 0 ? '' : item.jumlah}
                        onChange={(e) => handleItemChange(idx, 'jumlah', Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-semibold text-right placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Supplier */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.supplier}
                        onChange={(e) => handleItemChange(idx, 'supplier', e.target.value)}
                        placeholder="e.g. PT Textile Jaya"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Delete action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand total bar */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-zinc-800 text-sm">
            <span className="text-xs text-zinc-400">
              Total Barang: <strong className="text-white">{formData.items.length} item</strong>
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-zinc-400 text-xs">Total Taksiran Biaya:</span>
              <span className="text-base font-bold text-emerald-400">
                {formatRupiah(formData.totalTaksiran)}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: URAIAN KEPERLUAN & CATATAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Uraian Keperluan */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              3. Uraian Keperluan
            </span>
            <textarea
              rows={3}
              value={formData.uraianKeperluan}
              onChange={(e) => setFormData({ ...formData, uraianKeperluan: e.target.value })}
              placeholder="Contoh: Pengadaan bahan baku kain dan jarum untuk order buyer ekspor batch November 2026..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Tanggal Diterima & Catatan */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              4. Tanggal Diterima & Catatan
            </span>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Tanggal Diterima (oleh Purchasing / Gudang):
              </label>
              <input
                type="date"
                value={formData.tanggalDiterima || ''}
                onChange={(e) => setFormData({ ...formData, tanggalDiterima: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 mb-2.5"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Catatan Tambahan :
              </label>
              <textarea
                rows={2}
                value={formData.catatan || ''}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                placeholder="Catatan terkait lead time supplier, syarat pembayaran, dll..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PENGESAHAN (DIMINTA OLEH) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              5. Pengesahan Pemohon (Diminta)
            </span>
            <span className="text-xs text-zinc-500">
              Kolom Diterima, Diketahui, dan Disetujui dibiarkan kosong untuk tanda tangan fisik
            </span>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-[240px]">
              <label className="text-xs font-semibold text-zinc-300">Nama Pemohon (Diminta):</label>
              <input
                type="text"
                value={formData.dimintaOleh || ''}
                onChange={(e) => setFormData({ ...formData, dimintaOleh: e.target.value })}
                placeholder="ROYAN - RDI"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div className="flex items-center space-x-3 bg-zinc-900/60 p-2.5 px-3.5 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">Tanda Tangan Otomatis:</span>
              <img
                src={SIGNATURE_ROYAN_SRC}
                alt="Tanda Tangan ROYAN - RDI"
                className="h-10 w-auto object-contain bg-white rounded p-1"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM SUBMIT BAR */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => onPreview(formData)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl border border-zinc-700 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Pratinjau Dokumen A4</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Formulir Permohonan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
