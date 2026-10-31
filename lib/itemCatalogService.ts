import { PurchaseItem, PurchaseRequisition } from '@/types/purchase';
import { splitQuantity } from './purchaseEditing';

export interface MasterItem {
  namaBarang: string;
  satuan?: string;
  hargaSatuan?: number;
  supplier?: string;
  lastUsedAt?: string;
}

const CATALOG_STORAGE_KEY = 'gagaclo_master_items_v1';

// Initial default catalog matching Gagaclo operations
export const DEFAULT_MASTER_ITEMS: MasterItem[] = [
  {
    namaBarang: 'Kain Katun Combed 30s Hitam Reaktif',
    satuan: 'Roll',
    hargaSatuan: 1250000,
    supplier: 'PT Surya Textile Jaya',
  },
  {
    namaBarang: 'Benang Jahit Polyester 40/2 Putih',
    satuan: 'Cones',
    hargaSatuan: 18500,
    supplier: 'CV Mitra Benang Lestari',
  },
  {
    namaBarang: 'Jarum Mesin Jahit DBx1 No. 11 & 14',
    satuan: 'Box',
    hargaSatuan: 45000,
    supplier: 'Toko Sparepart Jahit Barokah',
  },
  {
    namaBarang: 'Jarum Mesin Obras DCx27 No. 11',
    satuan: 'Box',
    hargaSatuan: 55000,
    supplier: 'Toko Sparepart Jahit Barokah',
  },
  {
    namaBarang: 'Minyak Mesin Jahit White Oil Grade A',
    satuan: 'Galon',
    hargaSatuan: 180000,
    supplier: 'Aneka Pelumas Industri',
  },
  {
    namaBarang: 'Pisau Mesin Potong Tegak 8 Inch',
    satuan: 'Pcs',
    hargaSatuan: 85000,
    supplier: 'CV Mandiri Cutting Tools',
  },
  {
    namaBarang: 'Kancing Kemeja 4 Lubang 18L Hitam',
    satuan: 'Gross',
    hargaSatuan: 35000,
    supplier: 'Toko Kancing Maju Jaya',
  },
  {
    namaBarang: 'Resleting YKK Metal No. 5 Hitam 60 cm',
    satuan: 'Pcs',
    hargaSatuan: 12000,
    supplier: 'Distributor YKK Indonesia',
  },
  {
    namaBarang: 'Label Woven Damask Gagaclo 3x5 cm',
    satuan: 'Pcs',
    hargaSatuan: 450,
    supplier: 'CV Label Sukses Mandiri',
  },
  {
    namaBarang: 'Hangtag Kraft 350gsm + Tali Loop Pin',
    satuan: 'Pcs',
    hargaSatuan: 350,
    supplier: 'Percetakan Jaya Grafika',
  },
  {
    namaBarang: 'Tinta Sablon Plastisol Super White',
    satuan: 'Kg',
    hargaSatuan: 165000,
    supplier: 'Toko Sablon Nusantara',
  },
  {
    namaBarang: 'Binder Sablon Waterbase Clear',
    satuan: 'Kg',
    hargaSatuan: 75000,
    supplier: 'Toko Sablon Nusantara',
  },
  {
    namaBarang: 'Kertas Pola Karton Samson 80gsm',
    satuan: 'Roll',
    hargaSatuan: 220000,
    supplier: 'Toko Kertas Sentosa',
  },
  {
    namaBarang: 'Gunting Kain Tailor Scissors 10 Inch',
    satuan: 'Pcs',
    hargaSatuan: 145000,
    supplier: 'CV Alat Jahit Prima',
  },
  {
    namaBarang: 'Plastik OPP Polybag Seal 30x40 cm Tebal 0.04',
    satuan: 'Pack',
    hargaSatuan: 35000,
    supplier: 'Aneka Plastik Jaya',
  },
  {
    namaBarang: 'Plastik OPP Packing 30x40 cm',
    satuan: 'Pack',
    hargaSatuan: 32000,
    supplier: 'Aneka Plastik Jaya',
  },
  {
    namaBarang: 'Lakban Bening 2 Inch 100 Yard',
    satuan: 'Roll',
    hargaSatuan: 14000,
    supplier: 'Toko Stationery Mulia',
  },
  {
    namaBarang: 'Silica Gel Sachet 2 gram Foodgrade',
    satuan: 'Pcs',
    hargaSatuan: 200,
    supplier: 'Kimia Bersama',
  },
  {
    namaBarang: 'Kertas Thermal Label Barcode 100x150 mm',
    satuan: 'Roll',
    hargaSatuan: 68000,
    supplier: 'Barcode Solution ID',
  },
  {
    namaBarang: 'Kertas HVS A4 75gsm PaperOne',
    satuan: 'Rim',
    hargaSatuan: 48000,
    supplier: 'Toko Stationery Mulia',
  },
  {
    namaBarang: 'Pulpen Gel Hitam 0.5 mm',
    satuan: 'Box',
    hargaSatuan: 24000,
    supplier: 'Toko Stationery Mulia',
  },
];

// Helper to normalize item name for matching
export function normalizeItemKey(name: string): string {
  return (name || '').trim().toLowerCase();
}

/**
 * Retrieve master items from localStorage, initialized with defaults
 */
export function getMasterItems(): MasterItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_MASTER_ITEMS;
  }

  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(DEFAULT_MASTER_ITEMS));
      return DEFAULT_MASTER_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse master items from localStorage:', err);
  }

  return DEFAULT_MASTER_ITEMS;
}

/**
 * Save master items list to localStorage
 */
export function saveMasterItems(items: MasterItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('fpp-catalog-updated'));
  } catch (err) {
    console.error('Failed to save master items to localStorage:', err);
  }
}

/**
 * Record a new item or update an existing item in the catalog
 * "jika barang baru maka add baru, jika barang lama maka ambil/update dari data lama"
 */
export function recordMasterItem(item: {
  namaBarang: string;
  satuan?: string;
  hargaSatuan?: number;
  supplier?: string;
}): MasterItem[] {
  const cleanName = (item.namaBarang || '').trim();
  if (!cleanName) return getMasterItems();

  const key = normalizeItemKey(cleanName);
  const current = getMasterItems();
  const index = current.findIndex((c) => normalizeItemKey(c.namaBarang) === key);

  const now = new Date().toISOString();

  if (index >= 0) {
    // Existing item: update with latest non-empty details
    const existing = current[index];
    const updated: MasterItem = {
      namaBarang: cleanName, // preserve casing
      satuan: item.satuan?.trim() || existing.satuan,
      hargaSatuan: item.hargaSatuan !== undefined && item.hargaSatuan > 0 ? item.hargaSatuan : existing.hargaSatuan,
      supplier: item.supplier?.trim() || existing.supplier,
      lastUsedAt: now,
    };
    current[index] = updated;
  } else {
    // New item: add to catalog
    current.unshift({
      namaBarang: cleanName,
      satuan: item.satuan?.trim() || '',
      hargaSatuan: item.hargaSatuan || 0,
      supplier: item.supplier?.trim() || '',
      lastUsedAt: now,
    });
  }

  saveMasterItems(current);
  return current;
}

/**
 * Find an item from the master catalog by name (case-insensitive)
 * Returns the old data (Satuan, Harga Satuan, Supplier) if found
 */
export function findMasterItem(namaBarang: string, catalog?: MasterItem[]): MasterItem | undefined {
  const key = normalizeItemKey(namaBarang);
  if (!key) return undefined;

  const items = catalog || getMasterItems();
  return items.find((item) => normalizeItemKey(item.namaBarang) === key);
}

/**
 * Sync and populate master catalog from all loaded purchases
 * Ensures all previous purchases contribute to the autocomplete catalog
 */
export function syncMasterItemsFromPurchases(purchases: PurchaseRequisition[]): MasterItem[] {
  const current = getMasterItems();
  const map = new Map<string, MasterItem>();

  // Load current catalog first
  current.forEach((item) => {
    map.set(normalizeItemKey(item.namaBarang), item);
  });

  // Merge items from all purchases (newer purchases take precedence)
  purchases.forEach((p) => {
    if (Array.isArray(p.items)) {
      p.items.forEach((item) => {
        const cleanName = (item.namaBarang || '').trim();
        if (!cleanName) return;

        const key = normalizeItemKey(cleanName);
        const { satuan } = splitQuantity(item);
        const harga = item.hargaSatuan || 0;
        const supplier = (item.supplier || '').trim();

        if (map.has(key)) {
          const existing = map.get(key)!;
          map.set(key, {
            namaBarang: cleanName,
            satuan: satuan || existing.satuan,
            hargaSatuan: harga > 0 ? harga : existing.hargaSatuan,
            supplier: supplier || existing.supplier,
            lastUsedAt: p.updatedAt || p.createdAt || existing.lastUsedAt,
          });
        } else {
          map.set(key, {
            namaBarang: cleanName,
            satuan: satuan || '',
            hargaSatuan: harga,
            supplier: supplier,
            lastUsedAt: p.updatedAt || p.createdAt,
          });
        }
      });
    }
  });

  const merged = Array.from(map.values());
  saveMasterItems(merged);
  return merged;
}

/**
 * Get unique list of all suppliers from the master catalog
 */
export function getAllSuppliers(catalog?: MasterItem[]): string[] {
  const items = catalog || getMasterItems();
  const set = new Set<string>();

  items.forEach((item) => {
    const s = (item.supplier || '').trim();
    if (s) set.add(s);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
}

/**
 * Get unique list of all units/satuan from the master catalog
 */
export function getAllUnits(catalog?: MasterItem[]): string[] {
  const defaults = ['Pcs', 'Unit', 'Set', 'Box', 'Roll', 'Kg', 'Meter', 'Liter', 'Gross', 'Pack', 'Rim', 'Cones'];
  const items = catalog || getMasterItems();
  const set = new Set<string>(defaults);

  items.forEach((item) => {
    const u = (item.satuan || '').trim();
    if (u) {
      // Capitalize first letter
      set.add(u.charAt(0).toUpperCase() + u.slice(1));
    }
  });

  return Array.from(set);
}
