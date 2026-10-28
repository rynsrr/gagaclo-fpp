# 📄 PT Gagaclo — Formulir Permohonan Pembelian (FPP)

Aplikasi pembuatan, pencatatan, dan pencetakan dokumen resmi **Formulir Permohonan Pembelian (FPP) PT Gagaclo** dengan format cetak 1:1 presisi sesuai blanko standar pabrik (kertas A4), terintegrasi dengan **Supabase Database (Cloud Realtime)**, **GitHub**, dan **Vercel**.

---

## ✨ Fitur Aplikasi

1. **Format Dokumen Fisik 1:1 Presisi Tinggi (PT Gagaclo)**:
   - Header resmi kop surat: Logo **P.T. GAGACLO** & alamat lengkap pabrik Semarang.
   - Garis ganda (*double horizontal rule*) khas formulir resmi korporat.
   - Pilihan Jenis: **Rutin / Non Rutin / Segera** dengan indikator lingkaran otomatis sesuai pilihan (*Lingkar salah satu*).
   - Tabel barang: No, Nama Barang, Banyaknya, Taksiran Harga (Satuan & Jumlah), dan Rekomendasi Supplier.
   - Kolom **Uraian Keperluan**, **Tanggal Diterima**, dan **Catatan**.
   - Matriks Tanda Tangan 4 Kolom: **Diterima** | **Diminta** | **Diketahui** | **Disetujui**.
   - Siap cetak ke printer fisik maupun diekspor ke file PDF via dialog cetak browser (`Ctrl + P` / `Cmd + P`).

2. **Editor Formulir Interaktif**:
   - Auto-generate Nomor FPP berurutan (`FPP/YYYY/MM/xxx`).
   - Kalkulasi otomatis total taksiran biaya (`Jumlah = Banyaknya × Harga Satuan`).
   - Format mata uang Rupiah (`Rp`).
   - Tombol tambah / hapus baris dinamis.
   - Muat contoh data pabrik garmen (*kain katun, benang, jarum, plastik packing*).

3. **Manajemen Arsip Permohonan**:
   - Filter cepat berdasarkan Jenis: *Rutin*, *Non Rutin*, *Segera (Urgent)*.
   - Pencarian instan berdasarkan Nomor FPP, Nama Barang, Supplier, atau Pemohon.
   - Ringkasan statistik total pengeluaran dan jumlah dokumen.
   - Aksi: Pratinjau Cetak A4, Edit, Duplikasi, dan Hapus.

4. **Sinkronisasi Cloud Supabase & Local Fallback**:
   - Terintegrasi dengan database Supabase (`purchase_requisitions`).
   - Real-time updates saat ada perubahan data dari multi-user.
   - Fallback otomatis ke `localStorage` browser jika jaringan offline.

---

## 🗄️ Setup Database Supabase Baru

1. Buat project baru di **[https://supabase.com/dashboard](https://supabase.com/dashboard)**.
2. Buka menu **SQL Editor** di bilah kiri dashboard Supabase.
3. Klik **New query**, lalu salin dan jalankan skrip SQL berikut:

```sql
-- 1. Buat Tabel Formulir Permohonan Pembelian
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id TEXT PRIMARY KEY,
  nomor TEXT NOT NULL,
  tanggal DATE NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('Rutin', 'Non Rutin', 'Segera')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  uraian_keperluan TEXT,
  tanggal_diterima DATE,
  catatan TEXT,
  diminta_oleh TEXT,
  diminta_tanggal DATE,
  diketahui_oleh TEXT,
  diketahui_tanggal DATE,
  disetujui_oleh TEXT,
  disetujui_tanggal DATE,
  diterima_oleh TEXT,
  diterima_tanggal DATE,
  status TEXT NOT NULL DEFAULT 'Diajukan',
  total_taksiran NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_nomor ON public.purchase_requisitions(nomor);

-- Policy Akses Penuh (RLS)
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access to purchase_requisitions" 
ON public.purchase_requisitions FOR ALL 
USING (true) WITH CHECK (true);

-- Aktifkan Realtime Sync Multi-Device
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_requisitions;
```

4. Buka **Project Settings &rarr; API** di Supabase, lalu salin **Project URL** dan **anon public key**.
5. Tempelkan ke file `.env.local` di folder project ini:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

---

## 💻 Menjalankan di Komputer Lokal

```bash
cd "G:\gagaclo-fpp"
npm run dev
```

Buka browser di: **http://localhost:3000**
