'use client';

import React from 'react';
import { PurchaseRequisition, PurchaseJenis } from '@/types/purchase';
import { formatRupiah, formatShortDate, formatIndonesianDate } from '@/lib/purchaseService';
import { LOGO_GAGACLO_SRC } from '@/lib/logoData';
import { Printer, Download, Eye } from 'lucide-react';

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
    dimintaOleh,
    dimintaTanggal,
    diketahuiOleh,
    diketahuiTanggal,
    disetujuiOleh,
    disetujuiTanggal,
    diterimaOleh,
    diterimaTanggal,
  } = data;

  // We want to ensure at least 8-10 rows to fill the paper naturally like the scanned form
  const totalDisplayRows = Math.max(items.length, 9);
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
            <span className="font-medium">Pratinjau Cetak 1:1 (Format Kertas A4 Standar PT Gagaclo)</span>
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

      {/* Actual Physical Paper Document - Exactly matching PT Gagaclo scan */}
      <div 
        id="printable-fpp-document"
        className="printable-document bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-[12mm] shadow-2xl print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none text-[12px] font-sans border border-gray-300 print:border-none select-text box-border"
        style={{ fontFamily: '"Arial", "Helvetica", sans-serif' }}
      >
        {/* ================= HEADER KOP SURAT ================= */}
        <div className="flex items-start justify-between pb-2">
          {/* Logo P.T. GAGACLO (Exact Official Logo) */}
          <div className="flex items-center">
            <img
              src={LOGO_GAGACLO_SRC}
              alt="P.T. GAGACLO"
              className="h-12 w-auto object-contain block"
              style={{ maxHeight: '50px' }}
            />
          </div>

          {/* Company Details */}
          <div className="text-left text-[11px] leading-tight text-black">
            <div className="font-semibold text-[11.5px]">PT Gagaclo</div>
            <div>JL. Tambakaji Timur No.1,</div>
            <div>Semarang 50185, Central Java, Indonesia</div>
            <div>Tel: +62 24 866 1188 Fax: +62 24 866 2562</div>
          </div>
        </div>

        {/* Double Horizontal Rule */}
        <div className="w-full mb-1">
          <div className="w-full border-b-[2.5px] border-black"></div>
          <div className="w-full border-b-[1px] border-black mt-[1.5px]"></div>
        </div>

        {/* ================= TITLE ================= */}
        <div className="w-full border-x border-t border-black text-center py-1 font-bold text-[13px] tracking-wider uppercase bg-white">
          FORMULIR PERMOHONAN PEMBELIAN
        </div>

        {/* ================= TOP METADATA BOX ================= */}
        <div className="w-full border border-black grid grid-cols-12 text-[11px]">
          {/* Left Column: Jenis */}
          <div className="col-span-8 p-1.5 border-r border-black flex flex-col justify-center">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Jenis :</span>
              <div className="flex items-center space-x-1.5 tracking-wide">
                {/* Rutin */}
                <span
                  className={`px-2 py-0.5 ${
                    jenis === 'Rutin'
                      ? 'border-[1.5px] border-black rounded-full font-bold'
                      : 'italic'
                  }`}
                >
                  Rutin
                </span>
                <span>/</span>

                {/* Non Rutin */}
                <span
                  className={`px-2 py-0.5 ${
                    jenis === 'Non Rutin'
                      ? 'border-[1.5px] border-black rounded-full font-bold'
                      : 'italic'
                  }`}
                >
                  Non Rutin
                </span>
                <span>/</span>

                {/* Segera */}
                <span
                  className={`px-2 py-0.5 ${
                    jenis === 'Segera'
                      ? 'border-[1.5px] border-black rounded-full font-bold'
                      : 'italic'
                  }`}
                >
                  Segera
                </span>
              </div>
            </div>
            <div className="text-[9.5px] text-black font-normal mt-0.5 ml-10">
              (Lingkar salah satu )
            </div>
          </div>

          {/* Right Column: Nomor & Tanggal */}
          <div className="col-span-4 p-1.5 flex flex-col justify-center text-[11px] space-y-1">
            <div className="flex items-center">
              <span className="w-16 font-semibold">Nomor</span>
              <span>: {nomor || ''}</span>
            </div>
            <div className="flex items-center">
              <span className="w-16 font-semibold">Tanggal</span>
              <span>: {tanggal ? formatShortDate(tanggal) : ''}</span>
            </div>
          </div>
        </div>

        {/* ================= MAIN TABLE ================= */}
        <div className="w-full border-x border-b border-black">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-black text-center font-bold text-[11px] leading-tight">
                <th className="border-r border-black p-1.5 w-[5%] font-bold">No</th>
                <th className="border-r border-black p-1.5 w-[28%] font-bold text-center">Nama Barang</th>
                <th className="border-r border-black p-1.5 w-[12%] font-bold text-center">Banyaknya</th>
                <th className="border-r border-black p-0 w-[30%]" colSpan={2}>
                  <div className="border-b border-black py-1 font-bold text-center">Taksiran Harga</div>
                  <div className="grid grid-cols-2">
                    <div className="border-r border-black py-1 font-bold text-center">Satuan</div>
                    <div className="py-1 font-bold text-center">Jumlah</div>
                  </div>
                </th>
                <th className="p-1.5 w-[25%] font-bold text-center">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {/* Actual Items */}
              {items.map((item, index) => (
                <tr key={item.id || index} className="align-top border-b border-black/10">
                  <td className="border-r border-black px-1.5 py-1 text-center font-normal">{index + 1}</td>
                  <td className="border-r border-black px-2 py-1 font-normal break-words">{item.namaBarang}</td>
                  <td className="border-r border-black px-1.5 py-1 text-center font-normal whitespace-nowrap">
                    {item.banyaknya || (item.qty ? `${item.qty} ${item.satuan || ''}` : '')}
                  </td>
                  <td className="border-r border-black px-2 py-1 text-right font-normal whitespace-nowrap">
                    {item.hargaSatuan > 0 ? formatRupiah(item.hargaSatuan).replace('Rp ', '') : ''}
                  </td>
                  <td className="border-r border-black px-2 py-1 text-right font-normal whitespace-nowrap">
                    {item.jumlah > 0 ? formatRupiah(item.jumlah).replace('Rp ', '') : ''}
                  </td>
                  <td className="px-2 py-1 font-normal break-words">{item.supplier || ''}</td>
                </tr>
              ))}

              {/* Blank filler rows to match physical paper form proportion */}
              {Array.from({ length: fillerRowsCount }).map((_, fIdx) => (
                <tr key={`filler-${fIdx}`} className="h-6">
                  <td className="border-r border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border-r border-black px-2 py-1">&nbsp;</td>
                  <td className="border-r border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border-r border-black px-2 py-1">&nbsp;</td>
                  <td className="border-r border-black px-2 py-1">&nbsp;</td>
                  <td className="px-2 py-1">&nbsp;</td>
                </tr>
              ))}

              {/* Extended blank grid space if fewer items */}
              {items.length <= 4 && (
                <tr className="h-28">
                  <td className="border-r border-black">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ================= URAIAN KEPERLUAN ================= */}
        <div className="w-full border-x border-b border-black text-[11px]">
          <div className="p-1.5 font-bold border-b border-black/10">
            Uraian Keperluan :
          </div>
          <div className="px-2 pb-2 min-h-[50px] leading-relaxed whitespace-pre-wrap text-[11px] text-black">
            {uraianKeperluan || ''}
          </div>
        </div>

        {/* ================= FOOTER / TANGGAL DITERIMA & APPROVALS ================= */}
        <div className="w-full border-x border-b border-black grid grid-cols-12 text-[11px]">
          {/* Left Column: Tanggal Diterima & Catatan */}
          <div className="col-span-7 p-2 border-r border-black flex flex-col justify-between min-h-[110px]">
            <div>
              <div className="font-semibold mb-1">
                Tanggal Diterima :{' '}
                <span className="font-normal">
                  {tanggalDiterima ? formatShortDate(tanggalDiterima) : ''}
                </span>
              </div>
              <div className="font-semibold">
                Catatan :
              </div>
              <div className="mt-1 pl-1 text-[10.5px] leading-snug whitespace-pre-wrap text-black">
                {catatan || ''}
              </div>
            </div>
          </div>

          {/* Right Column: 4 Approval Columns (Diterima, Diminta, Diketahui, Disetujui) */}
          <div className="col-span-5 grid grid-cols-4 text-center">
            {/* 1. Diterima */}
            <div className="border-r border-black flex flex-col justify-between">
              <div className="border-b border-black py-1 font-semibold text-[10.5px]">Diterima</div>
              <div className="flex-1 min-h-[60px] flex items-center justify-center text-[10px] text-gray-500 italic">
                {diterimaOleh ? (
                  <span className="text-black not-italic font-medium">{diterimaOleh}</span>
                ) : ''}
              </div>
              <div className="border-t border-black/20 py-0.5 text-[9px] text-gray-700">
                {diterimaTanggal ? formatShortDate(diterimaTanggal) : ''}
              </div>
            </div>

            {/* 2. Diminta */}
            <div className="border-r border-black flex flex-col justify-between">
              <div className="border-b border-black py-1 font-semibold text-[10.5px]">Diminta</div>
              <div className="flex-1 min-h-[60px] flex items-center justify-center text-[10px] text-gray-500 italic">
                {dimintaOleh ? (
                  <span className="text-black not-italic font-medium">{dimintaOleh}</span>
                ) : ''}
              </div>
              <div className="border-t border-black/20 py-0.5 text-[9px] text-gray-700">
                {dimintaTanggal ? formatShortDate(dimintaTanggal) : ''}
              </div>
            </div>

            {/* 3. Diketahui */}
            <div className="border-r border-black flex flex-col justify-between">
              <div className="border-b border-black py-1 font-semibold text-[10.5px]">Diketahui</div>
              <div className="flex-1 min-h-[60px] flex items-center justify-center text-[10px] text-gray-500 italic">
                {diketahuiOleh ? (
                  <span className="text-black not-italic font-medium">{diketahuiOleh}</span>
                ) : ''}
              </div>
              <div className="border-t border-black/20 py-0.5 text-[9px] text-gray-700">
                {diketahuiTanggal ? formatShortDate(diketahuiTanggal) : ''}
              </div>
            </div>

            {/* 4. Disetujui */}
            <div className="flex flex-col justify-between">
              <div className="border-b border-black py-1 font-semibold text-[10.5px]">Disetujui</div>
              <div className="flex-1 min-h-[60px] flex items-center justify-center text-[10px] text-gray-500 italic">
                {disetujuiOleh ? (
                  <span className="text-black not-italic font-medium">{disetujuiOleh}</span>
                ) : ''}
              </div>
              <div className="border-t border-black/20 py-0.5 text-[9px] text-gray-700">
                {disetujuiTanggal ? formatShortDate(disetujuiTanggal) : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
