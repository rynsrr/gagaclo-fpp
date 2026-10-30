import { storageScope } from './storageScope';
import { DEFAULT_PURCHASE_REQUISITION, PurchaseItem, PurchaseRequisition } from '@/types/purchase';

export type ValidationErrors = Record<string, string>;
export function splitQuantity(item: PurchaseItem) {
  const match = (item.banyaknya || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  return { qty: item.qty ?? (match ? Number(match[1].replace(',', '.')) : undefined), satuan: item.satuan ?? (match?.[2] || '') };
}
export function updateQuantity(item: PurchaseItem, qty: string, satuan: string): PurchaseItem {
  const count = qty === '' ? undefined : Number(qty.replace(',', '.'));
  return { ...item, qty: count, satuan, banyaknya: `${qty}${satuan ? ` ${satuan}` : ''}`.trim(), jumlah: Math.round(Math.max(0, count || 0) * Math.max(0, item.hargaSatuan || 0)) };
}
export function validatePurchase(item: PurchaseRequisition, all: PurchaseRequisition[]): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!item.nomor.trim()) errors.nomor = 'Isi nomor FPP.';
  else if (all.some(p => p.id !== item.id && p.nomor.trim().toUpperCase() === item.nomor.trim().toUpperCase())) errors.nomor = 'Nomor sudah digunakan. Buat nomor berikutnya.';
  if (!item.tanggal || Number.isNaN(Date.parse(item.tanggal))) errors.tanggal = 'Isi tanggal yang valid.';
  if (!item.jenis) errors.jenis = 'Pilih Rutin, Non Rutin, atau Segera.';
  if (!item.dimintaOleh?.trim()) errors.dimintaOleh = 'Isi nama pemohon.';
  if (!item.items.length) errors.items = 'Tambahkan sedikitnya satu barang.';
  item.items.forEach((row, i) => {
    if (!row.namaBarang.trim()) errors[`items.${i}.namaBarang`] = 'Isi nama barang.';
    const { qty, satuan } = splitQuantity(row);
    if (!Number.isFinite(qty) || (qty || 0) <= 0) errors[`items.${i}.qty`] = 'Qty harus lebih dari 0.';
    if (!satuan.trim()) errors[`items.${i}.satuan`] = 'Isi satuan, misalnya Pcs.';
    if (!Number.isFinite(row.hargaSatuan) || row.hargaSatuan < 0) errors[`items.${i}.hargaSatuan`] = 'Harga tidak boleh negatif.';
    if (!Number.isFinite(row.jumlah) || row.jumlah < 0) errors[`items.${i}.jumlah`] = 'Jumlah tidak boleh negatif.';
  });
  return errors;
}
export function fingerprint(item: PurchaseRequisition) {
  const { id, createdAt, updatedAt, pendingSync, ...content } = item;
  return JSON.stringify(content);
}
export function duplicatePurchase(item: PurchaseRequisition, nomor: string, tanggal: string): PurchaseRequisition {
  const now = new Date().toISOString();
  return { ...item, id: `fpp-${crypto.randomUUID()}`, nomor, tanggal, status: 'Draft', tanggalDiterima: '', diterimaOleh: '', diterimaTanggal: '', diketahuiOleh: '', diketahuiTanggal: '', disetujuiOleh: '', disetujuiTanggal: '', dimintaTanggal: '', items: item.items.map((row, i) => ({ ...row, id: `item-${crypto.randomUUID()}`, no: i + 1 })), photos: (item.photos || []).map(p => ({ ...p })), createdAt: now, updatedAt: now, pendingSync: false };
}
const DRAFT_KEY = 'gagaclo_fpp_drafts_v1';
type Drafts = { active: string; entries: Record<string, { purchase: PurchaseRequisition; savedAt: string }> };
function readDrafts(): Drafts {
  try { const value = JSON.parse(localStorage.getItem(`${DRAFT_KEY}:${storageScope()}`) || 'null'); return value?.entries ? value : { active: '', entries: {} }; }
  catch { return { active: '', entries: {} }; }
}
export function getDraft(id?: string) {
  const data = readDrafts();
  const entry = data.entries[id || data.active];
  return entry && Array.isArray(entry.purchase?.items) && typeof entry.purchase.id === 'string' ? entry : null;
}
export function storeDraft(purchase: PurchaseRequisition) {
  const data = readDrafts();
  const savedAt = new Date().toISOString();
  data.active = purchase.id;
  data.entries[purchase.id] = { purchase, savedAt };
  const entries = Object.entries(data.entries).sort((a,b) => b[1].savedAt.localeCompare(a[1].savedAt)).slice(0,30);
  localStorage.setItem(`${DRAFT_KEY}:${storageScope()}`, JSON.stringify({ ...data, entries: Object.fromEntries(entries) }));
  return savedAt;
}
export function removeDraft(id: string) {
  const data = readDrafts();
  delete data.entries[id];
  if (data.active === id) data.active = '';
  localStorage.setItem(`${DRAFT_KEY}:${storageScope()}`, JSON.stringify(data));
}
export function blankBaseline(purchase: PurchaseRequisition) {
  return { ...DEFAULT_PURCHASE_REQUISITION, nomor: purchase.nomor, tanggal: purchase.tanggal };
}

export function listDrafts() { return Object.values(readDrafts().entries).sort((a,b)=>b.savedAt.localeCompare(a.savedAt)); }
