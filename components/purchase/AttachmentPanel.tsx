'use client';
import { useEffect, useRef, useState } from 'react';
import { PurchasePhoto } from '@/types/purchase';
import { compressImage } from '@/lib/imageUtils';
import { uploadAttachment, deleteAttachment } from '@/lib/attachmentUpload';
import { ArrowLeft, ArrowRight, UploadCloud, X, FileText, Eye } from 'lucide-react';

export default function AttachmentPanel({
  photos,
  isEditable,
  onChange,
  compactMobile = false,
}: {
  photos: PurchasePhoto[];
  isEditable: boolean;
  onChange: (photos: PurchasePhoto[]) => void;
  compactMobile?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const latest = useRef(photos);
  latest.current = photos;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PurchasePhoto | null>(null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const add = async (files: File[]) => {
    if (!isEditable || uploading) return;
    const remaining = 6 - latest.current.length;
    if (!remaining) {
      setError('Maksimal 6 lampiran per FPP.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      for (const [index, file] of files.slice(0, remaining).entries()) {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          throw new Error('Pilih foto atau PDF.');
        }
        setProgress(`Menyiapkan ${index + 1}/${Math.min(files.length, remaining)}: ${file.name}`);
        const data = file.type.startsWith('image/') ? await compressImage(file, 1200, 0.82) : file;
        const url = await uploadAttachment(data, (percent) => {
          if (active.current) setProgress(`Mengunggah ${file.name}: ${percent}%`);
        });
        if (!active.current) return;
        const next = [
          ...latest.current,
          {
            id: `attachment-${crypto.randomUUID()}`,
            url,
            name: file.name,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            type: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
            size: file.size,
          },
        ];
        latest.current = next;
        onChange(next);
      }
      if (files.length > remaining) {
        setError(`Hanya ${remaining} file ditambahkan karena batas 6 lampiran.`);
      }
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : 'Unggah gagal.');
    } finally {
      if (active.current) {
        setUploading(false);
        setProgress('');
      }
    }
  };

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (!isEditable || uploading) return;
      const files = Array.from(event.clipboardData?.files || []).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length) {
        event.preventDefault();
        void add(files);
      }
    };
    window.addEventListener('paste', paste, true);
    return () => window.removeEventListener('paste', paste, true);
  }, [isEditable, uploading]);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview]);

  const move = (index: number, step: number) => {
    const next = [...photos];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    onChange(next);
  };

  return (
    <div
      className={
        compactMobile
          ? 'flex-1 flex flex-col gap-3'
          : 'border-x border-b border-black p-3 bg-white flex-1 flex flex-col justify-between gap-2.5 min-h-[110mm]'
      }
      onDragOver={(e) => {
        if (isEditable) e.preventDefault();
      }}
      onDrop={(e) => {
        if (isEditable) {
          e.preventDefault();
          void add(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <input
        ref={input}
        className="hidden"
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={(e) => {
          void add(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />

      {isEditable && (
        <button
          type="button"
          disabled={uploading || photos.length >= 6}
          onClick={() => input.current?.click()}
          className={`w-full min-h-[44px] p-2.5 border border-dashed rounded-xl text-xs font-medium flex gap-2 items-center justify-center disabled:opacity-50 transition shrink-0 ${
            compactMobile
              ? 'border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 text-slate-800'
          }`}
        >
          <UploadCloud size={16} aria-hidden="true" />
          <span>{compactMobile ? 'Ambil Foto / Pilih File PDF' : 'Tambah foto / PDF'}</span>
          <span className="text-slate-500 dark:text-zinc-400">({photos.length}/6)</span>
        </button>
      )}

      {uploading && <p role="status" className="text-xs text-blue-700 dark:text-blue-400 shrink-0">{progress}</p>}
      {error && <p role="alert" className="text-xs text-red-700 dark:text-red-400 shrink-0">{error}</p>}

      {!photos.length ? (
        <div
          onClick={() => isEditable && input.current?.click()}
          className={`flex-1 border-2 border-dashed ${
            isEditable
              ? compactMobile
                ? 'border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40 cursor-pointer'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer'
              : 'border-slate-200 dark:border-zinc-800'
          } rounded-xl flex flex-col items-center justify-center p-5 text-center transition ${
            compactMobile ? 'min-h-[120px]' : 'min-h-[75mm]'
          }`}
        >
          <UploadCloud className="w-7 h-7 text-slate-400 mb-2" aria-hidden="true" />
          <span className={`text-xs font-medium ${compactMobile ? 'text-slate-700 dark:text-zinc-300' : 'text-slate-700'}`}>
            {isEditable
              ? compactMobile
                ? 'Ketuk untuk unggah foto dari kamera, galeri, atau file PDF'
                : 'Tarik file ke sini atau tempel foto dengan Ctrl+V'
              : 'Belum ada lampiran.'}
          </span>
          {isEditable && (
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Maksimal 6 file (Foto atau PDF), maks. 3,9 MB per file
            </span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 content-start">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className={`rounded-xl border p-2 min-w-0 shadow-sm flex flex-col justify-between ${
                compactMobile
                  ? 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => setPreview(photo)}
                className="w-full h-24 flex items-center justify-center bg-slate-100 dark:bg-zinc-900 rounded-lg overflow-hidden"
                aria-label={`Pratinjau ${photo.name || photo.caption || `lampiran ${i + 1}`}`}
              >
                {photo.type === 'application/pdf' ? (
                  <FileText size={36} className="text-red-600" aria-hidden="true" />
                ) : (
                  <img
                    src={photo.url}
                    alt={photo.caption || `Lampiran ${i + 1}`}
                    className="max-h-24 max-w-full object-contain"
                  />
                )}
              </button>
              {isEditable ? (
                <input
                  aria-label={`Keterangan lampiran ${i + 1}`}
                  value={photo.caption || ''}
                  onChange={(e) =>
                    onChange(
                      photos.map((p) =>
                        p.id === photo.id ? { ...p, caption: e.target.value } : p
                      )
                    )
                  }
                  placeholder={`Lampiran ${i + 1}`}
                  className={`w-full mt-2 border rounded-lg px-2 py-1.5 ${
                    compactMobile
                      ? 'text-xs min-h-[38px] bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white'
                      : 'text-[11px] bg-white border-slate-200 text-slate-900'
                  }`}
                />
              ) : (
                <p className="text-[11px] break-words mt-2 truncate">{photo.caption || photo.name}</p>
              )}
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/70 dark:border-zinc-800">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                  {photo.type === 'application/pdf' ? 'PDF' : 'Foto'} {i + 1}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPreview(photo)}
                    aria-label={`Buka lampiran ${i + 1}`}
                    className={`${compactMobile ? 'min-h-[36px] min-w-[36px]' : 'p-1'} flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300`}
                  >
                    <Eye size={14} aria-hidden="true" />
                  </button>
                  {isEditable && (
                    <>
                      <button
                        type="button"
                        disabled={i === 0 || uploading}
                        onClick={() => move(i, -1)}
                        aria-label={`Geser lampiran ${i + 1} ke kiri`}
                        className={`${compactMobile ? 'min-h-[36px] min-w-[36px]' : 'p-1'} flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 disabled:opacity-25`}
                      >
                        <ArrowLeft size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={i === photos.length - 1 || uploading}
                        onClick={() => move(i, 1)}
                        aria-label={`Geser lampiran ${i + 1} ke kanan`}
                        className={`${compactMobile ? 'min-h-[36px] min-w-[36px]' : 'p-1'} flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 disabled:opacity-25`}
                      >
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => {
                          void deleteAttachment(photo.url);
                          onChange(photos.filter((p) => p.id !== photo.id));
                        }}
                        aria-label={`Lepas dan hapus lampiran ${i + 1}`}
                        className={`${compactMobile ? 'min-h-[36px] min-w-[36px]' : 'p-1'} flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-red-700 dark:text-red-400 transition`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau lampiran"
          className="fixed inset-0 z-50 bg-black/85 flex flex-col p-4 pb-safe"
        >
          <div className="flex justify-between items-center gap-3 text-white mb-3">
            <span className="text-sm font-medium truncate">
              {preview.name || preview.caption || 'Lampiran'}
            </span>
            <button
              autoFocus
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Tutup pratinjau"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          {preview.type === 'application/pdf' ? (
            <iframe title={preview.name || 'PDF'} src={preview.url} className="w-full flex-1 bg-white rounded-xl" />
          ) : (
            <img
              src={preview.url}
              alt={preview.caption || 'Lampiran'}
              className="w-full flex-1 min-h-0 object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}
