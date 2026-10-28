import { PurchaseRequisition, PurchaseItem, PurchaseJenis } from '@/types/purchase';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'gagaclo_purchase_requisitions_v2';

// Sample default requisition matching PT Gagaclo operations
export const SAMPLE_PURCHASE_REQUISITION: PurchaseRequisition = {
  id: 'fpp-sample-001',
  nomor: '',
  tanggal: '2026-10-28',
  jenis: 'Rutin',
  items: [
    {
      id: 'item-1',
      no: 1,
      namaBarang: 'Kain Katun Combed 30s Hitam',
      banyaknya: '5 Roll',
      hargaSatuan: 1250000,
      jumlah: 6250000,
      supplier: 'PT Surya Textile Jaya',
    },
    {
      id: 'item-2',
      no: 2,
      namaBarang: 'Benang Jahit Polyester 40/2 Putih',
      banyaknya: '20 Cones',
      hargaSatuan: 18500,
      jumlah: 370000,
      supplier: 'CV Mitra Benang Lestari',
    },
    {
      id: 'item-3',
      no: 3,
      namaBarang: 'Jarum Mesin Jahit DBx1 No. 11 & 14',
      banyaknya: '10 Box',
      hargaSatuan: 45000,
      jumlah: 450000,
      supplier: 'Toko Sparepart Jahit Barokah',
    },
    {
      id: 'item-4',
      no: 4,
      namaBarang: 'Plastik OPP Packing 30x40 cm',
      banyaknya: '15 Pack',
      hargaSatuan: 32000,
      jumlah: 480000,
      supplier: 'Aneka Plastik Jaya',
    },
  ],
  uraianKeperluan: 'Pengadaan bahan baku dan perlengkapan produksi garmen untuk pemenuhan PO Buyer batch November 2026.',
  tanggalDiterima: '',
  catatan: 'Prioritas pengiriman kain katun maksimal tanggal 2 November 2026.',
  dimintaOleh: 'ROYAN - RDI',
  dimintaTanggal: '',
  diketahuiOleh: '',
  diketahuiTanggal: '',
  disetujuiOleh: '',
  disetujuiTanggal: '',
  diterimaOleh: '',
  diterimaTanggal: '',
  status: 'Diajukan',
  totalTaksiran: 7550000,
  createdAt: '2026-10-28T08:00:00.000Z',
  updatedAt: '2026-10-28T08:00:00.000Z',
};

// Map DB row to Frontend Model
function mapFromDb(row: any): PurchaseRequisition {
  return {
    id: row.id,
    nomor: row.nomor || '',
    tanggal: row.tanggal || '',
    jenis: (row.jenis as PurchaseJenis) || 'Rutin',
    items: Array.isArray(row.items) ? row.items : [],
    uraianKeperluan: row.uraian_keperluan || '',
    tanggalDiterima: row.tanggal_diterima || '',
    catatan: row.catatan || '',
    dimintaOleh: row.diminta_oleh || '',
    dimintaTanggal: row.diminta_tanggal || '',
    diketahuiOleh: row.diketahui_oleh || '',
    diketahuiTanggal: row.diketahui_tanggal || '',
    disetujuiOleh: row.disetujui_oleh || '',
    disetujuiTanggal: row.disetujui_tanggal || '',
    diterimaOleh: row.diterima_oleh || '',
    diterimaTanggal: row.diterima_tanggal || '',
    status: row.status || 'Draft',
    totalTaksiran: Number(row.total_taksiran) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// Map Frontend Model to DB row
function mapToDb(item: PurchaseRequisition): any {
  return {
    id: item.id,
    nomor: item.nomor || '',
    tanggal: item.tanggal,
    jenis: item.jenis,
    items: item.items,
    uraian_keperluan: item.uraianKeperluan,
    tanggal_diterima: item.tanggalDiterima || null,
    catatan: item.catatan || null,
    diminta_oleh: item.dimintaOleh || null,
    diminta_tanggal: item.dimintaTanggal || null,
    diketahui_oleh: item.diketahuiOleh || null,
    diketahui_tanggal: item.diketahuiTanggal || null,
    disetujui_oleh: item.disetujuiOleh || null,
    disetujui_tanggal: item.disetujuiTanggal || null,
    diterima_oleh: item.diterimaOleh || null,
    diterima_tanggal: item.diterimaTanggal || null,
    status: item.status,
    total_taksiran: item.totalTaksiran,
    updated_at: new Date().toISOString(),
  };
}

// LocalStorage helpers
export function getLocalPurchases(): PurchaseRequisition[] {
  if (typeof window === 'undefined') return [SAMPLE_PURCHASE_REQUISITION];
  try {
    // Clear old legacy cache if present
    if (localStorage.getItem('gagaclo_purchase_requisitions_v1')) {
      localStorage.removeItem('gagaclo_purchase_requisitions_v1');
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_PURCHASE_REQUISITION]));
      return [SAMPLE_PURCHASE_REQUISITION];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure any legacy sample has blank tanggalDiterima and nomor
      return parsed.map((item: PurchaseRequisition) => {
        if (item.id === 'fpp-sample-001') {
          return { ...item, tanggalDiterima: '', nomor: '' };
        }
        return item;
      });
    }
    return [SAMPLE_PURCHASE_REQUISITION];
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
    return [SAMPLE_PURCHASE_REQUISITION];
  }
}

export function saveLocalPurchases(list: PurchaseRequisition[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
  }
}

// Generate new sequential nomor FPP: FPP/YYYY/MM/xxx
export function generateNextNomor(list: PurchaseRequisition[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `FPP/${year}/${month}/`;

  let maxNum = 0;
  for (const item of list) {
    if (item.nomor && item.nomor.startsWith(prefix)) {
      const part = item.nomor.slice(prefix.length);
      const parsed = parseInt(part, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }

  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}

// Check if Supabase purchase table exists and is accessible
export async function checkSupabasePurchaseTable(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase
      .from('purchase_requisitions')
      .select('id')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Fetch all purchase requisitions (Supabase or LocalStorage)
export async function getAllPurchases(): Promise<{ data: PurchaseRequisition[]; fromCloud: boolean }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('purchase_requisitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(mapFromDb);
        // Cache to local storage
        saveLocalPurchases(mapped);
        return { data: mapped, fromCloud: true };
      }
    } catch (e) {
      console.warn('Supabase fetch failed, using local storage fallback', e);
    }
  }

  const local = getLocalPurchases();
  return { data: local, fromCloud: false };
}

// Save or Update Purchase Requisition
export async function savePurchase(item: PurchaseRequisition): Promise<{ success: boolean; fromCloud: boolean }> {
  const localList = getLocalPurchases();
  const existingIdx = localList.findIndex((x) => x.id === item.id);
  const nowIso = new Date().toISOString();

  const toSave: PurchaseRequisition = {
    ...item,
    updatedAt: nowIso,
    createdAt: item.createdAt || nowIso,
  };

  let updatedList: PurchaseRequisition[];
  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = toSave;
  } else {
    updatedList = [toSave, ...localList];
  }
  saveLocalPurchases(updatedList);

  if (isSupabaseConfigured() && supabase) {
    try {
      const dbPayload = mapToDb(toSave);
      const { error } = await supabase
        .from('purchase_requisitions')
        .upsert(dbPayload, { onConflict: 'id' });

      if (!error) {
        return { success: true, fromCloud: true };
      } else {
        console.warn('Supabase upsert failed:', error.message);
      }
    } catch (err) {
      console.warn('Supabase error while saving:', err);
    }
  }

  return { success: true, fromCloud: false };
}

// Delete Purchase Requisition
export async function deletePurchase(id: string): Promise<{ success: boolean; fromCloud: boolean }> {
  const localList = getLocalPurchases();
  const updatedList = localList.filter((x) => x.id !== id);
  saveLocalPurchases(updatedList);

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('purchase_requisitions')
        .delete()
        .eq('id', id);

      if (!error) {
        return { success: true, fromCloud: true };
      }
    } catch (err) {
      console.warn('Supabase error while deleting:', err);
    }
  }

  return { success: true, fromCloud: false };
}

// Helpers
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rp 0';
  return 'Rp ' + amount.toLocaleString('id-ID');
}

export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    return `${parseInt(day, 10)} ${monthName} ${year}`;
  }
  return dateStr;
}

export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
