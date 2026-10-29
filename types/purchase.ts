export type PurchaseJenis = '' | 'Rutin' | 'Non Rutin' | 'Segera';

export type PurchaseStatus = 'Draft' | 'Diajukan' | 'Diketahui' | 'Disetujui' | 'Diterima' | 'Selesai';

export interface PurchaseItem {
  id: string;
  no: number;
  namaBarang: string;
  banyaknya: string; // e.g. "10 Pcs", "5 Box"
  qty?: number;
  satuan?: string;
  hargaSatuan: number;
  jumlah: number;
  supplier: string;
}

export interface PurchasePhoto {
  id: string;
  url: string;
  caption?: string;
}

export interface PurchaseRequisition {
  id: string;
  nomor: string;
  tanggal: string; // YYYY-MM-DD
  jenis: PurchaseJenis;
  items: PurchaseItem[];
  uraianKeperluan: string;
  tanggalDiterima?: string;
  catatan?: string;
  photos?: PurchasePhoto[];
  
  // Signers & Approval flow
  dimintaOleh?: string;
  dimintaTanggal?: string;
  diketahuiOleh?: string;
  diketahuiTanggal?: string;
  disetujuiOleh?: string;
  disetujuiTanggal?: string;
  diterimaOleh?: string;
  diterimaTanggal?: string;

  status: PurchaseStatus;
  totalTaksiran: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PURCHASE_REQUISITION: PurchaseRequisition = {
  id: '',
  nomor: '',
  tanggal: new Date().toISOString().split('T')[0],
  jenis: '',
  items: [
    {
      id: '1',
      no: 1,
      namaBarang: '',
      banyaknya: '',
      hargaSatuan: 0,
      jumlah: 0,
      supplier: '',
    },
  ],
  uraianKeperluan: '',
  tanggalDiterima: '',
  catatan: '',
  photos: [],
  dimintaOleh: 'ROYAN',
  dimintaTanggal: '',
  diketahuiOleh: '',
  diketahuiTanggal: '',
  disetujuiOleh: '',
  disetujuiTanggal: '',
  diterimaOleh: '',
  diterimaTanggal: '',
  status: 'Draft',
  totalTaksiran: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
