'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PurchaseRequisition, PurchaseItem, PurchaseJenis, PurchasePhoto } from '@/types/purchase';
import { formatRupiah, formatShortDate } from '@/lib/purchaseService';
import { SIGNATURE_ROYAN_SRC } from '@/lib/logoData';
import GagacloLogo from '@/components/GagacloLogo';
import { compressImage } from '@/lib/imageUtils';
import {
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
  UploadCloud,
  X,
  RefreshCw,
  Clipboard,
} from 'lucide-react';

interface PurchaseDocumentProps {
  data: PurchaseRequisition;
  onChange?: (updated: PurchaseRequisition) => void;
  onSave?: () => void;
  onGenerateNomor?: () => void;
  saveNotice?: string | null;
  hidePrintControls?: boolean;
  isEditable?: boolean;
}

export default function PurchaseDocument({
  data,
  onChange,
  onSave,
  onGenerateNomor,
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

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  // Recalculate total taksiran
  const calculateTotal = (itemList: PurchaseItem[]): number => {
    return itemList.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
  };

  // Helper to update top-level fields
  const updateField = (field: keyof PurchaseRequisition, value: any) => {
    if (!onChange) return;
    onChange({
      ...dataRef.current,
      [field]: value,
    });
  };

  // Helper to update specific item row
  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    if (!onChange) return;
    const current = dataRef.current;
    const updatedItems = [...current.items];
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
      ...current,
      items: updatedItems,
      totalTaksiran: newTotal,
    });
  };

  // Add new item row
  const handleAddItemRow = () => {
    if (!onChange) return;
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

  // Remove item row
  const handleRemoveItemRow = (index: number) => {
    if (!onChange) return;
    const current = dataRef.current;
    if (current.items.length <= 1) {
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
        ...current,
        items: cleared,
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

  // Process and add files (supports up to 6 photos in a single page)
  const processAndAddFiles = async (fileList: (File | Blob)[]) => {
    if (!onChange) return;
    const current = dataRef.current;
    const currentPhotos = current.photos || [];
    const maxPhotos = 6;
    const remainingSlots = maxPhotos - currentPhotos.length;

    if (remainingSlots <= 0) {
      alert(`Maksimal lampiran ${maxPhotos} foto agar muat dalam 1 halaman A4.`);
      return;
    }

    setIsUploadingPhoto(true);
    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
    const newPhotos: PurchasePhoto[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      try {
        const compressedBase64 = await compressImage(file, 1200, 0.82);
        let caption = '';
        if ('name' in file && file.name && !file.name.toLowerCase().startsWith('image')) {
          caption = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        }
        newPhotos.push({
          id: 'photo-' + Date.now() + '-' + (currentPhotos.length + i + 1),
          url: compressedBase64,
          caption,
        });
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }

    setIsUploadingPhoto(false);
    if (newPhotos.length > 0) {
      onChange({
        ...current,
        photos: [...currentPhotos, ...newPhotos],
      });
      setPasteNotice(`${newPhotos.length} foto berhasil ditambahkan ke Lampiran!`);
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndAddFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    if (!onChange) return;
    const current = dataRef.current;
    onChange({
      ...current,
      photos: (current.photos || []).filter((p) => p.id !== photoId),
    });
  };

  const handlePhotoCaptionChange = (photoId: string, caption: string) => {
    if (!onChange) return;
    const current = dataRef.current;
    onChange({
      ...current,
      photos: (current.photos || []).map((p) => (p.id === photoId ? { ...p, caption } : p)),
    });
  };

  // Clipboard Paste listener (Global capture of Ctrl+V for images)
  useEffect(() => {
    if (!isEditable) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const imageFiles: (File | Blob)[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1 || item.kind === 'file') {
          const blob = item.getAsFile();
          if (blob && (blob.type.startsWith('image/') || item.type.startsWith('image/'))) {
            imageFiles.push(blob);
          }
        }
      }

      // If an image was pasted, intercept and add to Lampiran
      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        processAndAddFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste, true);
    return () => window.removeEventListener('paste', handlePaste, true);
  }, [isEditable]);

  // Click handler for clipboard paste button
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        const imageBlobs: Blob[] = [];
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            imageBlobs.push(blob);
          }
        }
        if (imageBlobs.length > 0) {
          await processAndAddFiles(imageBlobs);
          return;
        }
      }
    } catch (err) {
      console.log('Clipboard API direct read not permitted or empty:', err);
    }

    alert('Untuk menempelkan gambar:\n1. Salin gambar atau ambil tangkapan layar (tekan Win + Shift + S)\n2. Langsung tekan tombol Ctrl + V pada keyboard.');
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

  // Proportions: 3 rows minimum
  const totalDisplayRows = Math.max(items.length, 3);
  const fillerRowsCount = Math.max(0, totalDisplayRows - items.length);

  const photoCount = photos?.length || 0;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Action Toolbar (Hidden during print) */}
      {!hidePrintControls && (saveNotice || pasteNotice) && (
        <div className="no-print w-full max-w-[210mm] mb-4 space-y-2">
          {saveNotice && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm rounded-xl animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          {pasteNotice && (
            <div className="flex items-center space-x-2 p-3 bg-blue-950/80 border border-blue-500/50 text-blue-200 text-xs sm:text-sm rounded-xl animate-in fade-in duration-300">
              <Clipboard className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>{pasteNotice}</span>
            </div>
          )}


        </div>
      )}

      {/* Actual Physical Paper Document - Exactly 1 Page A4 */}
      <div
        id="printable-fpp-document"
        className="printable-document bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none text-[11px] font-sans border border-gray-300 print:border-none select-text box-border flex flex-col justify-between print:min-h-0 print:h-auto print:max-h-[280mm] print:overflow-hidden"
        style={{ fontFamily: '"Arial", "Helvetica", sans-serif' }}
      >
        {/* ========================================================
            BAGIAN ATAS: FORMULIR PERMOHONAN PEMBELIAN (SETENGAH A4)
            ======================================================== */}
        <div className="w-full flex flex-col">
          {/* ================= HEADER KOP SURAT ================= */}
          <div className="flex items-center justify-start gap-4 pb-1.5">
            {/* Logo P.T. GAGACLO (Official Wordmark) */}
            <div className="flex-shrink-0">
              <GagacloLogo className="text-[44px] text-black" />
            </div>

            {/* Alamat di samping logo P.T. GAGACLO */}
            <div className="text-left text-[9.5px] leading-tight text-black">
              <div>PT Gagaclo</div>
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
          <div className="w-full border-x border-b border-black flex text-[10px]">
            {/* Left Column: Tanggal Diterima & Catatan (58%) */}
            <div className="w-[58%] border-r border-black flex flex-col justify-between min-h-[85px]">
              {/* Row 1: Tanggal Diterima */}
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
                <div className="flex-1 min-h-[44px] flex flex-col items-center justify-center p-0.5 relative select-none overflow-hidden">
                  {/* Tanda Tangan Stroke / Paraf */}
                  <img
                    src={SIGNATURE_ROYAN_SRC}
                    alt="Tanda Tangan Diminta"
                    className="h-7 w-auto object-contain block mix-blend-multiply opacity-80"
                    style={{ maxHeight: '30px' }}
                  />
                  {/* Nama Royan dengan Style Signature */}
                  <span
                    className="font-signature text-[21px] font-bold text-black tracking-wide leading-none -mt-3.5 transform -rotate-3 select-none"
                    style={{
                      fontFamily: "var(--font-great-vibes), 'Great Vibes', var(--font-dancing-script), 'Dancing Script', 'Brush Script MT', cursive",
                    }}
                  >
                    Royan
                  </span>
                </div>
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
        <div className="w-full my-2 border-t border-dashed border-black/40 print:border-black/50"></div>

        {/* ========================================================
            BAGIAN BAWAH: LAMPIRAN (SETENGAH A4 - TETAP 1 HALAMAN)
            ======================================================== */}
        <div className="w-full flex flex-col h-[122mm] max-h-[122mm] overflow-hidden">
          {/* Header Lampiran (Hanya tulis LAMPIRAN) */}
          <div className="w-full border border-black py-1 font-bold text-[12px] tracking-wider uppercase text-left bg-white flex items-center justify-between px-3 relative">
            <span className="font-bold tracking-wider text-left">LAMPIRAN</span>
            {isEditable ? (
              <div className="no-print flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  disabled={isUploadingPhoto || photoCount >= 6}
                  className="flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded border border-emerald-300 transition active:scale-95 disabled:opacity-40"
                  title="Tempel gambar dari clipboard (Ctrl+V)"
                >
                  <Clipboard className="w-3 h-3 text-emerald-600" />
                  <span>Tempel (Ctrl+V)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto || photoCount >= 6}
                  className="flex items-center space-x-1 px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-medium rounded border border-blue-300 transition active:scale-95 disabled:opacity-40"
                  title="Pilih file foto dari komputer"
                >
                  <Camera className="w-3 h-3 text-blue-600" />
                  <span>+ Upload ({photoCount}/6)</span>
                </button>
              </div>
            ) : null}
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

          {/* Area Kotak Lampiran - Strictly height-capped so it NEVER overflows into page 2 */}
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
                processAndAddFiles(Array.from(e.dataTransfer.files));
              }
            }}
            className={`w-full border-x border-b border-black p-2 flex-1 flex flex-col justify-center items-center h-[112mm] max-h-[112mm] overflow-hidden transition-colors ${
              isDragging ? 'bg-blue-50/50' : 'bg-white'
            }`}
          >
            {photos && photos.length > 0 ? (
              <div className="w-full h-full flex flex-col justify-center overflow-hidden">
                {/* Dynamic Grid Layout fitting up to 6 photos in a single page */}
                <div
                  className={`w-full h-full max-h-[106mm] items-center ${
                    photoCount === 1
                      ? 'flex justify-center items-center'
                      : photoCount === 2
                      ? 'grid grid-cols-2 gap-2 h-full'
                      : photoCount === 3
                      ? 'grid grid-cols-3 gap-2 h-full'
                      : photoCount === 4
                      ? 'grid grid-cols-2 grid-rows-2 gap-1.5 h-full'
                      : 'grid grid-cols-3 grid-rows-2 gap-1.5 h-full'
                  }`}
                >
                  {photos.map((photo, pIdx) => (
                    <div
                      key={photo.id || pIdx}
                      className={`border border-black/30 rounded p-1 flex flex-col items-center bg-white justify-between relative group ${
                        photoCount === 1
                          ? 'w-full max-w-sm h-full max-h-[104mm]'
                          : photoCount <= 3
                          ? 'w-full h-full max-h-[104mm]'
                          : 'w-full h-full max-h-[51mm]'
                      }`}
                    >
                      {/* Delete Photo Button (Screen only) */}
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition no-print shadow z-10"
                          title="Hapus foto ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      {/* Photo Image Container */}
                      <div
                        className={`w-full flex-1 flex items-center justify-center overflow-hidden ${
                          photoCount <= 3 ? 'min-h-[60mm] max-h-[86mm]' : 'min-h-[28mm] max-h-[38mm]'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || `Lampiran ${pIdx + 1}`}
                          className={`max-w-full object-contain ${
                            photoCount <= 3 ? 'max-h-[84mm]' : 'max-h-[36mm]'
                          }`}
                        />
                      </div>

                      {/* Photo Caption */}
                      <div className="w-full border-t border-gray-200 pt-0.5 mt-0.5">
                        {isEditable ? (
                          <>
                            <input
                              type="text"
                              value={photo.caption || ''}
                              onChange={(e) => handlePhotoCaptionChange(photo.id, e.target.value)}
                              placeholder={`Lampiran ${pIdx + 1}...`}
                              className={`w-full text-center font-medium text-black bg-transparent hover:bg-blue-50/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 focus:outline-none px-1 py-0 rounded transition print:hidden placeholder:text-gray-400 placeholder:italic ${
                                photoCount > 3 ? 'text-[8.5px]' : 'text-[9.5px]'
                              }`}
                            />
                            {photo.caption && (
                              <div
                                className={`hidden print:block font-medium text-center text-black truncate ${
                                  photoCount > 3 ? 'text-[8.5px]' : 'text-[9.5px]'
                                }`}
                              >
                                {photo.caption}
                              </div>
                            )}
                          </>
                        ) : (
                          photo.caption && (
                            <div
                              className={`text-center font-medium text-black truncate ${
                                photoCount > 3 ? 'text-[8.5px]' : 'text-[9.5px]'
                              }`}
                            >
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
              /* Polos ketika dicetak, di layar menjadi dropzone & paste zone interaktif */
              <div className="w-full h-full flex flex-col items-center justify-center">
                {isEditable ? (
                  <div
                    onClick={handlePasteFromClipboard}
                    className="no-print w-full max-w-lg p-5 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition text-center group"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-full group-hover:scale-105 transition">
                        <Clipboard className="w-5 h-5" />
                      </div>
                      <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full group-hover:scale-105 transition">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-gray-800 group-hover:text-blue-700">
                      Tempel Screenshot (Ctrl + V) atau Klik untuk Upload Gambar
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Ambil tangkapan layar (<strong>Win + Shift + S</strong>), lalu langsung tekan <strong>Ctrl + V</strong> di sini.
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Bisa muat hingga 6 foto sekaligus dalam 1 halaman A4 &bull; Otomatis terkompresi
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full"></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
