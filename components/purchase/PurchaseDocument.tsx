'use client';

import React from 'react';
import { PurchaseRequisition, PurchaseJenis } from '@/types/purchase';
import { formatRupiah, formatShortDate } from '@/lib/purchaseService';
import { LOGO_GAGACLO_SRC, SIGNATURE_ROYAN_SRC } from '@/lib/logoData';
import { Printer, Eye, Camera, Image as ImageIcon } from 'lucide-react';

interface PurchaseDocumentProps {
  data: PurchaseRequisition;
  hidePrintControls?: boolean;
}

export default function PurchaseDocument({ data, hidePrintControls = false }: PurchaseDocumentProps) {
  const {
    nomor,
    tanggal,
    jenis,
    items = [],
    uraianKeperluan,
    tanggalDiterima,
    catatan,
    photos = [],
    dimintaOleh,
    diketahuiOleh,
    disetujuiOleh,
    diterimaOleh,
  } = data;

  // Setengah A4 layout: 3-4 baris ringkas agar muat di setengah halaman A4 atas
  const totalDisplayRows = Math.max(items.length, 3);
  const fillerRowsCount = Math.max(0, totalDisplayRows - items.length);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Print Controls Header (Hidden in Print) */}
      {!hidePrintControls && (
        <div className="no-print w-full max-w-[210mm] mb-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 px-4 shadow-lg text-white">
          <div className="flex items-center space-x-2 text-sm text-zinc-300">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">
              Layout A4: Setengah Atas (FPP) &bull; Setengah Bawah (Referensi Foto)
            </span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-sm transition-all text-sm active:scale-95"
            title="Buka dialog cetak browser atau Simpan sebagai PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      )}

      {/* Actual Physical Paper Document - Exactly 1 Page A4 with Half-Page FPP & Half-Page Photo Reference */}
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
            {/* Logo P.T. GAGACLO (Exact Official Logo) */}
            <div className="flex-shrink-0">
              <img
                src={LOGO_GAGACLO_SRC}
                alt="P.T. GAGACLO"
                className="h-10 w-auto object-contain block"
                style={{ maxHeight: '42px' }}
              />
            </div>

            {/* Company Details (Mepet persis di sebelah logo, rata kiri) */}
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
          {/* Uses flex so Nomor/Tanggal has EXACT same 30% width as the Supplier column below */}
          <div className="w-full border border-black flex text-[10.5px]">
            {/* Left Column: Jenis (70% width, perfectly aligned with No + Nama Barang + Banyaknya + Taksiran) */}
            <div className="w-[70%] px-2.5 py-1 border-r border-black flex items-center justify-start gap-3 sm:gap-4 text-[10.5px]">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="italic font-normal">Jenis :</span>
                <div className="flex items-center space-x-1 tracking-wide italic">
                  {/* Rutin */}
                  <span
                    className={`px-1.5 py-0.5 ${
                      jenis === 'Rutin'
                        ? 'border-[1.5px] border-black rounded-full font-bold not-italic'
                        : ''
                    }`}
                  >
                    Rutin
                  </span>
                  <span>/</span>

                  {/* Non Rutin */}
                  <span
                    className={`px-1.5 py-0.5 ${
                      jenis === 'Non Rutin'
                        ? 'border-[1.5px] border-black rounded-full font-bold not-italic'
                        : ''
                    }`}
                  >
                    Non Rutin
                  </span>
                  <span>/</span>

                  {/* Segera */}
                  <span
                    className={`px-1.5 py-0.5 ${
                      jenis === 'Segera'
                        ? 'border-[1.5px] border-black rounded-full font-bold not-italic'
                        : ''
                    }`}
                  >
                    Segera
                  </span>
                </div>
              </div>
              <span className="text-[9.5px] text-black italic whitespace-nowrap">
                (Lingkar salah satu )
              </span>
            </div>

            {/* Right Column: Nomor & Tanggal (30% width - EXACT SAME WIDTH AS SUPPLIER COLUMN) */}
            <div className="w-[30%] px-2.5 py-1 flex flex-col justify-center text-[10.5px] space-y-0.5">
              <div className="flex items-center whitespace-nowrap">
                <span className="w-14 font-semibold shrink-0">Nomor</span>
                <span className="mr-1.5">:</span>
                <span className="font-normal font-mono">{nomor || 'ROYAN-0001'}</span>
              </div>
              <div className="flex items-center whitespace-nowrap">
                <span className="w-14 font-semibold shrink-0">Tanggal</span>
                <span className="mr-1.5">:</span>
                <span className="font-normal">{tanggal ? formatShortDate(tanggal) : ''}</span>
              </div>
            </div>
          </div>

          {/* ================= MAIN TABLE ================= */}
          <div className="w-full border-x border-b border-black">
            <table className="w-full table-fixed border-collapse text-[10.5px]">
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '31%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-black text-center font-bold text-[10.5px] leading-tight">
                  <th className="border-r border-black p-1 font-bold text-center">No</th>
                  <th className="border-r border-black p-1 font-bold text-center">Nama Barang</th>
                  <th className="border-r border-black p-1 font-bold text-center">Banyaknya</th>
                  <th className="border-r border-black p-0" colSpan={2}>
                    <div className="border-b border-black py-0.5 font-bold text-center">Taksiran Harga</div>
                    <div className="grid grid-cols-2">
                      <div className="border-r border-black py-0.5 font-bold text-center">Satuan</div>
                      <div className="py-0.5 font-bold text-center">Jumlah</div>
                    </div>
                  </th>
                  <th className="p-1 font-bold text-center">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {/* Actual Items */}
                {items.map((item, index) => (
                  <tr key={item.id || index} className="align-top border-b border-black/10 h-6">
                    <td className="border-r border-black px-1 py-0.5 text-center font-normal">{index + 1}</td>
                    <td className="border-r border-black px-1.5 py-0.5 font-normal break-words">{item.namaBarang}</td>
                    <td className="border-r border-black px-1 py-0.5 text-center font-normal whitespace-nowrap">
                      {item.banyaknya || (item.qty ? `${item.qty} ${item.satuan || ''}` : '')}
                    </td>
                    <td className="border-r border-black px-1.5 py-0.5 text-right font-normal whitespace-nowrap">
                      {item.hargaSatuan > 0 ? formatRupiah(item.hargaSatuan).replace('Rp ', '') : ''}
                    </td>
                    <td className="border-r border-black px-1.5 py-0.5 text-right font-normal whitespace-nowrap">
                      {item.jumlah > 0 ? formatRupiah(item.jumlah).replace('Rp ', '') : ''}
                    </td>
                    <td className="px-1.5 py-0.5 font-normal break-words">{item.supplier || ''}</td>
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
          </div>

          {/* ================= URAIAN KEPERLUAN ================= */}
          <div className="w-full border-x border-b border-black text-[10.5px] p-1.5 min-h-[40px]">
            <div className="font-bold mb-0.5">
              Uraian Keperluan :
            </div>
            <div className="px-0.5 leading-snug whitespace-pre-wrap text-[10.5px] text-black">
              {uraianKeperluan || ''}
            </div>
          </div>

          {/* ================= FOOTER / TANGGAL DITERIMA & APPROVALS ================= */}
          {/* Menggunakan w-[58%] dan w-[42%] agar GARIS LURUS SEMPURNA DENGAN GARIS SATUAN/JUMLAH DI ATAS */}
          <div className="w-full border-x border-b border-black flex text-[10px]">
            {/* Left Column: Tanggal Diterima & Catatan (EXACT 58% - LURUS SEJAJAR DENGAN PEMBATAS SATUAN/JUMLAH) */}
            <div className="w-[58%] border-r border-black flex flex-col justify-between min-h-[85px]">
              {/* Row 1: Tanggal Diterima */}
              <div className="border-b border-black p-1 font-normal">
                Tanggal Diterima :{' '}
                <span className="font-normal">
                  {tanggalDiterima && tanggalDiterima.trim() !== '' ? formatShortDate(tanggalDiterima) : ''}
                </span>
              </div>

              {/* Row 2: Catatan Box */}
              <div className="p-1 flex-1 min-h-[58px] flex flex-col">
                <div className="font-normal mb-0.5">Catatan :</div>
                <div className="px-1 text-[9.5px] leading-snug whitespace-pre-wrap text-black flex-1">
                  {catatan || ''}
                </div>
              </div>
            </div>

            {/* Right Column: 4 Approval Columns (EXACT 42%) */}
            <div className="w-[42%] grid grid-cols-4 text-center">
              {/* 1. Diterima */}
              <div className="border-r border-black flex flex-col justify-between">
                <div className="border-b border-black py-0.5 font-semibold text-[9.5px]">Diterima</div>
                <div className="flex-1 min-h-[44px]"></div>
                {/* Kolom Bawah Khusus untuk Diisi Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5 truncate">
                  {diterimaOleh || ''}
                </div>
              </div>

              {/* 2. Diminta (Tanda Tangan Asli ROYAN - RDI & Nama di Bawah) */}
              <div className="border-r border-black flex flex-col justify-between">
                <div className="border-b border-black py-0.5 font-semibold text-[9.5px]">Diminta</div>
                <div className="flex-1 min-h-[44px] flex items-center justify-center p-0.5">
                  <img
                    src={SIGNATURE_ROYAN_SRC}
                    alt="Tanda Tangan Diminta"
                    className="h-10 w-auto object-contain block mix-blend-multiply"
                    style={{ maxHeight: '42px' }}
                  />
                </div>
                {/* Kolom Bawah Khusus untuk Diisi Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5 truncate">
                  {dimintaOleh || ''}
                </div>
              </div>

              {/* 3. Diketahui */}
              <div className="border-r border-black flex flex-col justify-between">
                <div className="border-b border-black py-0.5 font-semibold text-[9.5px]">Diketahui</div>
                <div className="flex-1 min-h-[44px]"></div>
                {/* Kolom Bawah Khusus untuk Diisi Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5 truncate">
                  {diketahuiOleh || ''}
                </div>
              </div>

              {/* 4. Disetujui */}
              <div className="flex flex-col justify-between">
                <div className="border-b border-black py-0.5 font-semibold text-[9.5px]">Disetujui</div>
                <div className="flex-1 min-h-[44px]"></div>
                {/* Kolom Bawah Khusus untuk Diisi Nama */}
                <div className="border-t border-black h-[22px] flex items-center justify-center text-[9px] font-medium text-black px-0.5 truncate">
                  {disetujuiOleh || ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            BATAS SETENGAH HALAMAN A4 (GARIS PUTUS-PUTUS / PEMOTONG)
            ======================================================== */}
        <div className="w-full my-2.5 flex items-center justify-between text-zinc-400 text-[8.5px] print:text-gray-500">
          <div className="border-t border-dashed border-gray-400 flex-1"></div>
          <span className="px-2 italic font-semibold tracking-wider uppercase">
            Batas Setengah Halaman A4 &bull; Referensi Foto / Lampiran Fisik
          </span>
          <div className="border-t border-dashed border-gray-400 flex-1"></div>
        </div>

        {/* ========================================================
            BAGIAN BAWAH: TEMPAT REFERENSI FOTO (SETENGAH A4)
            ======================================================== */}
        <div className="w-full flex-1 flex flex-col min-h-[115mm] justify-between">
          {/* Header Referensi Foto */}
          <div className="w-full border border-black bg-gray-100 print:bg-gray-100 flex items-center justify-between px-3 py-1 text-[10.5px] font-bold">
            <div className="flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 print:hidden text-zinc-700" />
              <span className="tracking-wide uppercase">LAMPIRAN : REFERENSI FOTO / CONTOH BARANG</span>
            </div>
            <span className="font-normal text-[9.5px] italic">
              Nomor FPP: <span className="font-bold font-mono not-italic">{nomor || 'ROYAN-0001'}</span>
            </span>
          </div>

          {/* Area Kotak Foto */}
          <div className="w-full border-x border-b border-black p-2.5 flex-1 flex flex-col justify-between">
            {photos && photos.length > 0 ? (
              <div
                className={`grid gap-2.5 w-full flex-1 items-center ${
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
                    className="border border-black/30 rounded p-1.5 flex flex-col items-center bg-zinc-50 print:bg-white w-full h-full justify-between max-h-[92mm]"
                  >
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden min-h-[65mm] max-h-[75mm]">
                      <img
                        src={photo.url}
                        alt={photo.caption || `Referensi Foto ${pIdx + 1}`}
                        className="max-h-[72mm] max-w-full object-contain rounded"
                      />
                    </div>
                    {photo.caption && (
                      <div className="mt-1 text-[9.5px] font-medium text-center text-black border-t border-gray-200 pt-0.5 w-full truncate">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Frame Kosong untuk Ditempel Foto Fisik / Placeholder Form Scanned Style */
              <div className="grid grid-cols-2 gap-3 w-full flex-1 min-h-[85mm] items-stretch">
                <div className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 text-center bg-gray-50/50 print:bg-white">
                  <Camera className="w-7 h-7 mb-1.5 text-gray-400 stroke-[1.5]" />
                  <span className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
                    Tempat Foto Referensi 1
                  </span>
                  <span className="text-[9px] text-gray-400 mt-1 max-w-[200px]">
                    Tempelkan foto fisik sampel barang atau unggah foto digital pada sistem
                  </span>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 text-center bg-gray-50/50 print:bg-white">
                  <Camera className="w-7 h-7 mb-1.5 text-gray-400 stroke-[1.5]" />
                  <span className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
                    Tempat Foto Referensi 2
                  </span>
                  <span className="text-[9px] text-gray-400 mt-1 max-w-[200px]">
                    Tempelkan foto fisik sampel barang atau unggah foto digital pada sistem
                  </span>
                </div>
              </div>
            )}

            {/* Footer Catatan Foto */}
            <div className="text-[8.5px] text-gray-500 italic mt-1.5 pt-1 border-t border-gray-200 flex justify-between items-center">
              <span>* Foto referensi ini berfungsi sebagai lampiran pendukung spesifikasi fisik barang yang diminta.</span>
              <span className="font-normal not-italic text-black font-semibold">PT GAGACLO &bull; FORMULIR FPP-01</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
