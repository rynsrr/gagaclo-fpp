'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PurchaseRequisition, PurchaseItem, PurchaseJenis, PurchasePhoto } from '@/types/purchase';
import { formatRupiah, formatShortDate } from '@/lib/purchaseService';
import { LOGO_GAGACLO_SRC, SIGNATURE_ROYAN_SRC } from '@/lib/logoData';
import { compressImage } from '@/lib/imageUtils';
import {
  Printer,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
  UploadCloud,
  X,
  RefreshCw,
} from 'lucide-react';

interface PurchaseDocumentProps {
  data: PurchaseRequisition;
  onChange?: (updated: PurchaseRequisition) => void;
  onSave?: () => void;
  onNew?: () => void;
  onLoadSample?: () => void;
  onGenerateNomor?: () => void;
  isSaving?: boolean;
  saveNotice?: string | null;
  hidePrintControls?: boolean;
  isEditable?: boolean;
}

export default function PurchaseDocument({
  data,
  onChange,
  onSave,
  onNew,
  onLoadSample,
  onGenerateNomor,
  isSaving = false,
  saveNotice = null,
  hidePrintControls = false,
  isEditable = true,
}: PurchaseDocumentProps) {
  const {
    nomor = '',
    tanggal = '',
    jenis = 'Rutin',
    items = [],
    uraianKeperluan = '',
    tanggalDiterima = '',
    catatan = '',
    photos = [],
    dimintaOleh = 'ROYAN - RDI',
    diketahuiOleh = '',
    disetujuiOleh = '',
    diterimaOleh = '',
  } = data;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Recalculate total taksiran
  const calculateTotal = (itemList: PurchaseItem[]): number => {
    return itemList.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
  };

  // Helper to update top-level fields
  const updateField = (field: keyof PurchaseRequisition, value: any) => {
    if (!onChange) return;
    onChange({
      ...data,
      [field]: value,
    });
  };

  // Helper to update specific item row
  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    if (!onChange) return;
    const updatedItems = [...items];
    const targetItem = { ...updatedItems[index], [field]: value };

    // Auto-calculate 'jumlah' if hargaSatuan or banyaknya contains numeric quantity
    if (field === 'hargaSatuan' || field === 'banyaknya') {
      const harga = field === 'hargaSatuan' ? Number(value) || 0 : targetItem.hargaSatuan || 0;
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
    onChange({
      ...data,
      items: updatedItems,
      totalTaksiran: newTotal,
    });
  };

  // Add new item row
  const handleAddItemRow = () => {
    if (!onChange) return;
    const newItem: PurchaseItem = {
      id: 'item-' + Date.now() + '-' + (items.length + 1),
      no: items.length + 1,
      namaBarang: '',
      banyaknya: '',
      hargaSatuan: 0,
      jumlah: 0,
      supplier: '',
    };
    const updated = [...items, newItem];
    onChange({
      ...data,
      items: updated,
      totalTaksiran: calculateTotal(updated),
    });
  };

  // Remove item row
  const handleRemoveItemRow = (index: number) => {
    if (!onChange) return;
    if (items.length <= 1) {
      // Just clear the single row rather than removing
      const cleared: PurchaseItem[] = [
        {
          id: 'item-1',
          no: 1,
          namaBarang: '',
          banyaknya: '',
          hargaSatuan: 0,
          jumlah: 0,
          supplier: '',
        },
      ];
      onChange({
        ...data,
        items: cleared,
        totalTaksiran: 0,
      });
      return;
    }
    const updated = items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, no: idx + 1 }));
    onChange({
      ...data,
      items: updated,
      totalTaksiran: calculateTotal(updated),
    });
  };

  // Photo handlers
  const processAndAddFiles = async (fileList: FileList | File[]) => {
    if (!onChange) return;
    const currentPhotos = photos || [];
    const remainingSlots = 4 - currentPhotos.length;
    if (remainingSlots <= 0) {
      alert('Maksimal lampiran 4 foto.');
      return;
    }

    setIsUploadingPhoto(true);
    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
    const newPhotos: PurchasePhoto[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressedBase64 = await compressImage(file, 1200, 0.82);
        newPhotos.push({
          id: 'photo-' + Date.now() + '-' + (currentPhotos.length + i + 1),
          url: compressedBase64,
          caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        });
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }

    setIsUploadingPhoto(false);
    if (newPhotos.length > 0) {
      onChange({
        ...data,
        photos: [...currentPhotos, ...newPhotos],
      });
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndAddFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    if (!onChange) return;
    onChange({
      ...data,
      photos: (photos || []).filter((p) => p.id !== photoId),
    });
  };

  const handlePhotoCaptionChange = (photoId: string, caption: string) => {
    if (!onChange) return;
    onChange({
      ...data,
      photos: (photos || []).map((p) => (p.id === photoId ? { ...p, caption } : p)),
    });
  };

  // Support Clipboard Paste for images (Ctrl+V)
  useEffect(() => {
    if (!isEditable) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) imageFiles.push(blob);
        }
      }
      if (imageFiles.length > 0) {
        processAndAddFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [data, isEditable, photos]);

  const handlePrint = () => {
    window.print();
  };

  // Keyboard shortcut: Ctrl+S to save, Ctrl+P to print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave) onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // Setengah A4 layout: 3 baris minimum agar proporsi seimbang persis scan
  const totalDisplayRows = Math.max(items.length, 3);
  const fillerRowsCount = Math.max(0, totalDisplayRows - items.length);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Action Toolbar (Hidden during print) */}
      {!hidePrintControls && (
        <div className="no-print w-full max-w-[210mm] mb-4 space-y-2">
          {saveNotice && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm rounded-xl animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 dark:bg-zinc-900/95 border border-slate-700 dark:border-zinc-800 rounded-2xl p-3 px-4 shadow-xl text-white">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg">
                Input Langsung di Formulir
              </span>
              <span className="hidden sm:inline text-xs text-zinc-400">
                Klik teks/kolom untuk mengedit &bull; Ctrl+S untuk simpan
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onLoadSample && (
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg border border-zinc-700 transition"
                  title="Muat contoh data PT Gagaclo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Contoh Data</span>
                </button>
              )}

              {onNew && (
                <button
                  type="button"
                  onClick={onNew}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg border border-zinc-700 transition"
                  title="Buat formulir baru dengan nomor urut berikutnya"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Baru</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
                title="Cetak langsung atau simpan sebagai PDF A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>

              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition active:scale-95 disabled:opacity-50"
                  title="Simpan formulir ke database Supabase dan penyimpanan lokal"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan FPP'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actual Physical Paper Document - Exactly 1 Page A4 (Half-Page FPP & Half-Page Lampiran) */}
      <div
        id="printable-fpp-document"
        className="printable-document bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none text-[11px] font-sans border border-gray-300 print:border-none select-text box-border flex flex-col justify-between"
        style={{ fontFamily: '"Arial", "Helvetica", sans-serif' }}
      >
        {/* ========================================================
            BAGIAN ATAS: FORMULIR PERMOHONAN PEMBELIAN (SETENGAH A4)
            ======================================================== */}
        <div className="w-full flex flex-col">
          {/* ================= HEADER KOP SURAT ================= */}
          <div className="flex items-center justify-start gap-4 pb-1.5">
            {/* Logo P.T. GAGACLO */}
            <div className="flex-shrink-0">
              <img
                src={LOGO_GAGACLO_SRC}
                alt="P.T. GAGACLO"
                className="h-10 w-auto object-contain block"
                style={{ maxHeight: '42px' }}
              />
            </div>

            {/* Company Details */}
            <div className="text-left text-[10px] leading-tight text-black">
              <div className="font-bold text-[10.5px]">PT Gagaclo</div>
              <div>JL. Tambakaji Timur No.1,</div>
              <div>Semarang 50185, Central Java, Indonesia</div>
              <div>Tel: +62 24 866 1188 Fax: +62 24 866 2562</div>
            </div>
          </div>

          {/* Double Horizontal Rule */}
          <div className="w-full mb-1">
            <div className="w-full border-b-[2px] border-black"></div>
            <div className="w-full border-b-[1px] border-black mt-[1px]"></div>
          </div>

          {/* ================= TITLE ================= */}
          <div className="w-full border-x border-t border-black text-center py-0.5 font-bold text-[12px] tracking-wider uppercase bg-white">
            FORMULIR PERMOHONAN PEMBELIAN
          </div>

          {/* ================= TOP METADATA BOX ================= */}
          <div className="w-full border border-black flex text-[10.5px]">
            {/* Left Column: Jenis (70% width) */}
            <div className="w-[70%] px-2.5 py-1 border-r border-black flex items-center justify-start gap-3 sm:gap-4 text-[10.5px]">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="italic font-normal">Jenis :</span>
                <div className="flex items-center space-x-1 tracking-wide italic">
                  {/* Rutin */}
                  <span
                    onClick={() => isEditable && updateField('jenis', 'Rutin')}
                    className={`px-1.5 py-0.5 ${
                      isEditable ? 'cursor-pointer hover:bg-black/5 select-none' : ''
                    } ${
                      jenis === 'Rutin'
                        ? 'border-[1.5px] border-black rounded-full font-bold not-italic'
                        : ''
                    }`}
                    title={isEditable ? 'Klik untuk memilih Rutin' : undefined}
                  >
                    Rutin
                  </span>
                  <span>/</span>

                  {/* Non Rutin */}
                  <span
                    onClick={() => isEditable && updateField('jenis', 'Non Rutin')}
                    className={`px-1.5 py-0.5 ${
                      isEditable ? 'cursor-pointer hover:bg-black/5 select-none' : ''
                    } ${
                      jenis === 'Non Rutin'
                        ? 'border-[1.5px] border-black rounded-full font-bold not-italic'
                        : ''
                    }`}
                    title={isEditable ? 'Klik untuk memilih Non Rutin' : undefined}
                  >
                    Non Rutin
                  </span>
                  <span>/</span>

                  {/* Segera */}
                  <span
                    onClick={() => isEditable && updateField('jenis', 'Segera')}
                    className={`px-1.5 py-0.5 ${
                      isEditable ? 'cursor-pointer hover:bg-black/5 select-none' : ''
                    } ${
                      jenis === 'Segera'
                        ? 'border-[1.5px] border-black rounded-full font-bold not-italic'
                        : ''
                    }`}
                    title={isEditable ? 'Klik untuk memilih Segera' : undefined}
                  >
                    Segera
                  </span>
                </div>
              </div>
              <span className="text-[9.5px] text-black italic whitespace-nowrap">
                (Lingkar salah satu )
              </span>
            </div>

            {/* Right Column: Nomor & Tanggal (30% width) */}
            <div className="w-[30%] px-2.5 py-1 flex flex-col justify-center text-[10.5px] space-y-0.5">
              {/* Nomor */}
              <div className="flex items-center whitespace-nowrap">
                <span className="w-14 font-semibold shrink-0">Nomor</span>
                <span className="mr-1.5">:</span>
                {isEditable ? (
                  <div className="flex items-center space-x-1 flex-1">
                    <input
                      type="text"
                      value={nomor}
                      onChange={(e) => updateField('nomor', e.target.value)}
                      placeholder="ROYAN-0001"
                      className="font-mono font-medium bg-transparent hover:bg-blue-50/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0 w-28 text-[10.5px] border-b border-dashed border-gray-300 hover:border-black transition print:hidden"
                    />
                    {onGenerateNomor && (
                      <button
                        type="button"
                        onClick={onGenerateNomor}
                        className="p-0.5 text-blue-600 hover:text-blue-800 rounded transition no-print"
                        title="Generate nomor urut berikutnya"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                    <span className="hidden print:inline font-mono font-normal">
                      {nomor || 'ROYAN-0001'}
                    </span>
                  </div>
                ) : (
                  <span className="font-normal font-mono">{nomor || 'ROYAN-0001'}</span>
                )}
              </div>

              {/* Tanggal */}
              <div className="flex items-center whitespace-nowrap">
                <span className="w-14 font-semibold shrink-0">Tanggal</span>
                <span className="mr-1.5">:</span>
                {isEditable ? (
                  <div className="flex items-center space-x-1 flex-1">
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => updateField('tanggal', e.target.value)}
                      className="bg-transparent hover:bg-blue-50/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0 text-[10.5px] border-b border-dashed border-gray-300 hover:border-black transition print:hidden"
                    />
                    <span className="hidden print:inline font-normal">
                      {tanggal ? formatShortDate(tanggal) : ''}
                    </span>
                  </div>
                ) : (
                  <span className="font-normal">{tanggal ? formatShortDate(tanggal) : ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* ================= MAIN TABLE ================= */}
          <div className="w-full border-x border-b border-black">
            <table className="w-full table-fixed border-collapse text-[10.5px]">
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '29%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr className="text-center font-bold text-[10px] leading-tight">
                  <th rowSpan={2} className="border-r border-b border-black p-1 font-bold text-center align-middle">No</th>
                  <th rowSpan={2} className="border-r border-b border-black p-1 font-bold text-center align-middle">Nama Barang</th>
                  <th rowSpan={2} className="border-r border-b border-black p-1 font-bold text-center align-middle whitespace-nowrap">Banyaknya</th>
                  <th colSpan={2} className="border-r border-b border-black py-0.5 font-bold text-center">Taksiran Harga</th>
                  <th rowSpan={2} className="border-b border-black p-1 font-bold text-center align-middle">Supplier</th>
                </tr>
                <tr className="text-center font-bold text-[10px] leading-tight">
                  <th className="border-r border-b border-black py-0.5 font-bold text-center">Satuan</th>
                  <th className="border-r border-b border-black py-0.5 font-bold text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {/* Actual Items */}
                {items.map((item, index) => (
                  <tr key={item.id || index} className="align-middle border-b border-black/10 group h-6">
                    {/* No */}
                    <td className="border-r border-black px-1 py-0.5 text-center font-normal">
                      {index + 1}
                    </td>

                    {/* Nama Barang */}
                    <td className="border-r border-black px-1 py-0.5 font-normal">
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value={item.namaBarang}
                            onChange={(e) => handleItemChange(index, 'namaBarang', e.target.value)}
                            placeholder="Ketik nama barang..."
                            className="w-full bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 text-[10.5px] rounded transition print:hidden placeholder:text-gray-400 placeholder:italic"
                          />
                          <span className="hidden print:inline-block break-words">{item.namaBarang}</span>
                        </>
                      ) : (
                        <span className="break-words">{item.namaBarang}</span>
                      )}
                    </td>

                    {/* Banyaknya */}
                    <td className="border-r border-black px-1 py-0.5 text-center font-normal">
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value={item.banyaknya}
                            onChange={(e) => handleItemChange(index, 'banyaknya', e.target.value)}
                            placeholder="e.g. 10 Pcs"
                            className="w-full text-center bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 text-[10.5px] rounded transition print:hidden placeholder:text-gray-400 placeholder:italic"
                          />
                          <span className="hidden print:inline-block whitespace-nowrap">
                            {item.banyaknya || (item.qty ? `${item.qty} ${item.satuan || ''}` : '')}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap">
                          {item.banyaknya || (item.qty ? `${item.qty} ${item.satuan || ''}` : '')}
                        </span>
                      )}
                    </td>

                    {/* Satuan */}
                    <td className="border-r border-black px-1 py-0.5 text-right font-normal">
                      {isEditable ? (
                        <>
                          <input
                            type="number"
                            value={item.hargaSatuan === 0 ? '' : item.hargaSatuan}
                            onChange={(e) =>
                              handleItemChange(index, 'hargaSatuan', e.target.value === '' ? 0 : Number(e.target.value))
                            }
                            placeholder="0"
                            className="w-full text-right bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 text-[10.5px] rounded transition print:hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-400"
                          />
                          <span className="hidden print:inline-block whitespace-nowrap">
                            {item.hargaSatuan > 0 ? formatRupiah(item.hargaSatuan).replace('Rp ', '') : ''}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap">
                          {item.hargaSatuan > 0 ? formatRupiah(item.hargaSatuan).replace('Rp ', '') : ''}
                        </span>
                      )}
                    </td>

                    {/* Jumlah */}
                    <td className="border-r border-black px-1 py-0.5 text-right font-normal">
                      {isEditable ? (
                        <>
                          <input
                            type="number"
                            value={item.jumlah === 0 ? '' : item.jumlah}
                            onChange={(e) =>
                              handleItemChange(index, 'jumlah', e.target.value === '' ? 0 : Number(e.target.value))
                            }
                            placeholder="0"
                            className="w-full text-right bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 text-[10.5px] rounded transition print:hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-400 font-medium"
                          />
                          <span className="hidden print:inline-block whitespace-nowrap">
                            {item.jumlah > 0 ? formatRupiah(item.jumlah).replace('Rp ', '') : ''}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap">
                          {item.jumlah > 0 ? formatRupiah(item.jumlah).replace('Rp ', '') : ''}
                        </span>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="px-1 py-0.5 font-normal">
                      {isEditable ? (
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={item.supplier}
                            onChange={(e) => handleItemChange(index, 'supplier', e.target.value)}
                            placeholder="Nama supplier..."
                            className="w-full bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 text-[10.5px] rounded transition print:hidden placeholder:text-gray-400 placeholder:italic"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-600 px-1 text-gray-400 transition no-print text-sm font-bold shrink-0"
                            title="Hapus baris barang ini"
                          >
                            &times;
                          </button>
                          <span className="hidden print:inline-block break-words">{item.supplier || ''}</span>
                        </div>
                      ) : (
                        <span className="break-words">{item.supplier || ''}</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Blank filler rows to maintain clean half-page proportion */}
                {Array.from({ length: fillerRowsCount }).map((_, fIdx) => (
                  <tr key={`filler-${fIdx}`} className="h-6">
                    <td className="border-r border-black px-1 py-0.5">&nbsp;</td>
                    <td className="border-r border-black px-1.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-black px-1 py-0.5">&nbsp;</td>
                    <td className="border-r border-black px-1.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-black px-1.5 py-0.5">&nbsp;</td>
                    <td className="px-1.5 py-0.5">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* In-table Add Row Action (Screen only) */}
            {isEditable && (
              <div className="no-print border-t border-dashed border-gray-200 bg-gray-50/80 hover:bg-blue-50/60 p-1 flex items-center justify-between px-3 text-[10.5px] text-gray-500 transition">
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-700 font-medium py-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Barang</span>
                </button>
                <span className="text-[10px] text-gray-400 italic">
                  Total {items.length} barang &bull; Taksiran: {formatRupiah(data.totalTaksiran || 0)}
                </span>
              </div>
            )}
          </div>

          {/* ================= URAIAN KEPERLUAN ================= */}
          <div className="w-full border-x border-b border-black text-[10.5px] p-1.5 min-h-[40px] flex flex-col">
            <div className="font-bold mb-0.5">Uraian Keperluan :</div>
            {isEditable ? (
              <>
                <textarea
                  rows={2}
                  value={uraianKeperluan}
                  onChange={(e) => updateField('uraianKeperluan', e.target.value)}
                  placeholder="Ketik uraian keperluan pengadaan barang di sini..."
                  className="w-full flex-1 bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 text-[10.5px] leading-snug resize-none rounded transition print:hidden placeholder:text-gray-400 placeholder:italic"
                />
                <div className="hidden print:block px-0.5 leading-snug whitespace-pre-wrap text-[10.5px] text-black">
                  {uraianKeperluan || ''}
                </div>
              </>
            ) : (
              <div className="px-0.5 leading-snug whitespace-pre-wrap text-[10.5px] text-black">
                {uraianKeperluan || ''}
              </div>
            )}
          </div>

          {/* ================= FOOTER / TANGGAL DITERIMA & APPROVALS ================= */}
          {/* w-[58%] and w-[42%] align perfectly with Satuan/Jumlah column */}
          <div className="w-full border-x border-b border-black flex text-[10px]">
            {/* Left Column: Tanggal Diterima & Catatan (58%) */}
            <div className="w-[58%] border-r border-black flex flex-col justify-between min-h-[85px]">
              {/* Row 1: Tanggal Diterima (Height h-[22px] matching approval headers) */}
              <div className="border-b border-black h-[22px] px-1.5 flex items-center font-normal text-[10px]">
                <span className="whitespace-nowrap mr-1">Tanggal Diterima :</span>
                {isEditable ? (
                  <div className="flex items-center space-x-1.5 flex-1">
                    <input
                      type="date"
                      value={tanggalDiterima}
                      onChange={(e) => updateField('tanggalDiterima', e.target.value)}
                      className="bg-transparent hover:bg-blue-50/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0 text-[10px] border-b border-dashed border-gray-300 hover:border-black transition print:hidden"
                    />
                    {tanggalDiterima && (
                      <button
                        type="button"
                        onClick={() => updateField('tanggalDiterima', '')}
                        className="text-[9px] text-red-500 hover:text-red-700 underline no-print"
                        title="Kosongkan tanggal jika belum diterima"
                      >
                        (Kosongkan)
                      </button>
                    )}
                    <span className="hidden print:inline font-normal">
                      {tanggalDiterima && tanggalDiterima.trim() !== '' ? formatShortDate(tanggalDiterima) : ''}
                    </span>
                  </div>
                ) : (
                  <span className="font-normal ml-1">
                    {tanggalDiterima && tanggalDiterima.trim() !== '' ? formatShortDate(tanggalDiterima) : ''}
                  </span>
                )}
              </div>

              {/* Row 2: Catatan Box */}
              <div className="p-1 flex-1 min-h-[58px] flex flex-col">
                <div className="font-normal mb-0.5">Catatan :</div>
                {isEditable ? (
                  <>
                    <textarea
                      rows={2}
                      value={catatan}
                      onChange={(e) => updateField('catatan', e.target.value)}
                      placeholder="Ketik catatan tambahan di sini..."
                      className="w-full flex-1 bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 text-[9.5px] leading-snug resize-none rounded transition print:hidden placeholder:text-gray-400 placeholder:italic"
                    />
                    <div className="hidden print:block px-1 text-[9.5px] leading-snug whitespace-pre-wrap text-black flex-1">
                      {catatan || ''}
                    </div>
                  </>
                ) : (
                  <div className="px-1 text-[9.5px] leading-snug whitespace-pre-wrap text-black flex-1">
                    {catatan || ''}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: 4 Approval Columns (42%) */}
            <div className="w-[42%] grid grid-cols-4 text-center">
              {/* 1. Diterima */}
              <div className="border-r border-black flex flex-col justify-between">
                <div className="border-b border-black h-[22px] flex items-center justify-center font-semibold text-[9.5px]">
                  Diterima
                </div>
                <div className="flex-1 min-h-[44px]"></div>
                {/* Kolom Bawah Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5">
                  {isEditable ? (
                    <>
                      <input
                        type="text"
                        value={diterimaOleh}
                        onChange={(e) => updateField('diterimaOleh', e.target.value)}
                        placeholder="Nama..."
                        className="w-full text-center bg-transparent hover:bg-blue-50/40 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none text-[9px] font-medium print:hidden rounded placeholder:text-gray-400 placeholder:italic"
                      />
                      <span className="hidden print:inline truncate">{diterimaOleh || ''}</span>
                    </>
                  ) : (
                    <span className="truncate">{diterimaOleh || ''}</span>
                  )}
                </div>
              </div>

              {/* 2. Diminta (Tanda Tangan Asli ROYAN - RDI & Nama di Bawah) */}
              <div className="border-r border-black flex flex-col justify-between">
                <div className="border-b border-black h-[22px] flex items-center justify-center font-semibold text-[9.5px]">
                  Diminta
                </div>
                <div className="flex-1 min-h-[44px] flex items-center justify-center p-0.5">
                  <img
                    src={SIGNATURE_ROYAN_SRC}
                    alt="Tanda Tangan Diminta"
                    className="h-10 w-auto object-contain block mix-blend-multiply"
                    style={{ maxHeight: '42px' }}
                  />
                </div>
                {/* Kolom Bawah Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5">
                  {isEditable ? (
                    <>
                      <input
                        type="text"
                        value={dimintaOleh}
                        onChange={(e) => updateField('dimintaOleh', e.target.value)}
                        placeholder="ROYAN - RDI"
                        className="w-full text-center bg-transparent hover:bg-blue-50/40 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none text-[9px] font-medium print:hidden rounded"
                      />
                      <span className="hidden print:inline truncate">{dimintaOleh || 'ROYAN - RDI'}</span>
                    </>
                  ) : (
                    <span className="truncate">{dimintaOleh || 'ROYAN - RDI'}</span>
                  )}
                </div>
              </div>

              {/* 3. Diketahui */}
              <div className="border-r border-black flex flex-col justify-between">
                <div className="border-b border-black h-[22px] flex items-center justify-center font-semibold text-[9.5px]">
                  Diketahui
                </div>
                <div className="flex-1 min-h-[44px]"></div>
                {/* Kolom Bawah Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5">
                  {isEditable ? (
                    <>
                      <input
                        type="text"
                        value={diketahuiOleh}
                        onChange={(e) => updateField('diketahuiOleh', e.target.value)}
                        placeholder="Nama..."
                        className="w-full text-center bg-transparent hover:bg-blue-50/40 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none text-[9px] font-medium print:hidden rounded placeholder:text-gray-400 placeholder:italic"
                      />
                      <span className="hidden print:inline truncate">{diketahuiOleh || ''}</span>
                    </>
                  ) : (
                    <span className="truncate">{diketahuiOleh || ''}</span>
                  )}
                </div>
              </div>

              {/* 4. Disetujui */}
              <div className="flex flex-col justify-between">
                <div className="border-b border-black h-[22px] flex items-center justify-center font-semibold text-[9.5px]">
                  Disetujui
                </div>
                <div className="flex-1 min-h-[44px]"></div>
                {/* Kolom Bawah Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5">
                  {isEditable ? (
                    <>
                      <input
                        type="text"
                        value={disetujuiOleh}
                        onChange={(e) => updateField('disetujuiOleh', e.target.value)}
                        placeholder="Nama..."
                        className="w-full text-center bg-transparent hover:bg-blue-50/40 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none text-[9px] font-medium print:hidden rounded placeholder:text-gray-400 placeholder:italic"
                      />
                      <span className="hidden print:inline truncate">{disetujuiOleh || ''}</span>
                    </>
                  ) : (
                    <span className="truncate">{disetujuiOleh || ''}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            BATAS SETENGAH HALAMAN A4 (HANYA GARIS PUTUS-PUTUS TANPA TEKS)
            ======================================================== */}
        <div className="w-full my-2.5 border-t border-dashed border-black/40 print:border-black/50"></div>

        {/* ========================================================
            BAGIAN BAWAH: LAMPIRAN (SETENGAH A4)
            ======================================================== */}
        <div className="w-full flex-1 flex flex-col min-h-[115mm]">
          {/* Header Lampiran (Hanya tulis LAMPIRAN) */}
          <div className="w-full border border-black py-1 font-bold text-[12px] tracking-wider uppercase text-center bg-white flex items-center justify-center relative">
            <span>LAMPIRAN</span>
            {isEditable && (
              <div className="absolute right-2 no-print flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto || (photos && photos.length >= 4)}
                  className="flex items-center space-x-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-medium rounded border border-blue-200 transition disabled:opacity-40"
                  title="Unggah foto referensi barang / sampel"
                >
                  <Camera className="w-3 h-3" />
                  <span>+ Tambah Foto ({photos?.length || 0}/4)</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden File Input for Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoFileChange}
            className="hidden"
          />

          {/* Area Kotak Lampiran */}
          <div
            onDragOver={(e) => {
              if (!isEditable) return;
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              if (!isEditable) return;
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processAndAddFiles(e.dataTransfer.files);
              }
            }}
            className={`w-full border-x border-b border-black p-3 flex-1 flex flex-col justify-center items-center transition-colors ${
              isDragging ? 'bg-blue-50/50' : 'bg-white'
            }`}
          >
            {photos && photos.length > 0 ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div
                  className={`grid gap-3 w-full flex-1 items-center ${
                    photos.length === 1
                      ? 'grid-cols-1 place-items-center'
                      : photos.length === 2
                      ? 'grid-cols-2'
                      : photos.length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2'
                  }`}
                >
                  {photos.map((photo, pIdx) => (
                    <div
                      key={photo.id || pIdx}
                      className="border border-black/20 rounded p-1.5 flex flex-col items-center bg-white w-full h-full justify-between max-h-[98mm] relative group"
                    >
                      {/* Delete Photo Button (Screen only) */}
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-2 right-2 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition no-print shadow"
                          title="Hapus foto ini"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="w-full flex-1 flex items-center justify-center overflow-hidden min-h-[65mm] max-h-[82mm]">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Lampiran ${pIdx + 1}`}
                          className="max-h-[80mm] max-w-full object-contain"
                        />
                      </div>

                      {/* Photo Caption */}
                      <div className="mt-1 w-full border-t border-gray-200 pt-0.5">
                        {isEditable ? (
                          <>
                            <input
                              type="text"
                              value={photo.caption || ''}
                              onChange={(e) => handlePhotoCaptionChange(photo.id, e.target.value)}
                              placeholder="Keterangan foto..."
                              className="w-full text-center text-[10px] font-medium text-black bg-transparent hover:bg-blue-50/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0.5 rounded transition print:hidden placeholder:text-gray-400 placeholder:italic"
                            />
                            {photo.caption && (
                              <div className="hidden print:block text-[10px] font-medium text-center text-black truncate">
                                {photo.caption}
                              </div>
                            )}
                          </>
                        ) : (
                          photo.caption && (
                            <div className="text-[10px] font-medium text-center text-black truncate">
                              {photo.caption}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Polos ketika dicetak, tetapi di layar memberi petunjuk upload yang sangat praktis */
              <div className="w-full flex-1 min-h-[95mm] flex flex-col items-center justify-center">
                {isEditable ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="no-print w-full max-w-md p-6 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition text-center group"
                  >
                    <div className="p-3 bg-gray-100 group-hover:bg-blue-100 text-gray-500 group-hover:text-blue-600 rounded-full mb-2 transition">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-semibold text-gray-700 group-hover:text-blue-700">
                      Klik untuk Unggah Referensi Foto / Lampiran
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Bisa tarik file langsung ke sini atau tekan <strong>Ctrl + V</strong> (Paste tangkapan layar)
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Maksimal 4 foto &bull; Otomatis dikompresi agar ukuran file minimal
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex-1 min-h-[95mm]"></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
