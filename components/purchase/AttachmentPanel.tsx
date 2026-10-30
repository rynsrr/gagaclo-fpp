'use client';
import { useEffect, useRef, useState } from 'react';
import { PurchasePhoto } from '@/types/purchase';
import { compressImage } from '@/lib/imageUtils';
import { uploadAttachment } from '@/lib/attachmentUpload';
import { ArrowLeft, ArrowRight, UploadCloud, X, FileText, Eye } from 'lucide-react';

export default function AttachmentPanel({ photos, isEditable, onChange }: { photos: PurchasePhoto[]; isEditable: boolean; onChange: (photos: PurchasePhoto[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const latest = useRef(photos);
  latest.current = photos;
  const [uploading,setUploading] = useState(false);
  const [progress,setProgress] = useState('');
  const [error,setError] = useState('');
  const [preview,setPreview] = useState<PurchasePhoto | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; },[]);
  const add = async (files: File[]) => {
    if (!isEditable || uploading) return;
    const remaining = 6 - latest.current.length;
    if (!remaining) { setError('Maksimal 6 lampiran per FPP.'); return; }
    setUploading(true); setError('');
    try {
      for (const [index,file] of files.slice(0,remaining).entries()) {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') throw new Error('Pilih foto atau PDF.');
        setProgress(`Menyiapkan ${index + 1}/${Math.min(files.length,remaining)}: ${file.name}`);
        const data = file.type.startsWith('image/') ? await compressImage(file,1200,0.82) : file;
        const url = await uploadAttachment(data,percent => { if(active.current) setProgress(`Mengunggah ${file.name}: ${percent}%`); });
        if (!active.current) return;
        const next = [...latest.current,{ id: `attachment-${crypto.randomUUID()}`, url, name:file.name, caption:file.name.replace(/\.[^/.]+$/,''), type:file.type.startsWith('image/') ? 'image/jpeg' : file.type, size:file.size }];
        latest.current=next; onChange(next);
      }
      if (files.length > remaining) setError(`Hanya ${remaining} file ditambahkan karena batas 6 lampiran.`);
    } catch (err) { if(active.current) setError(err instanceof Error ? err.message : 'Unggah gagal.'); }
    finally { if(active.current) { setUploading(false); setProgress(''); } }
  };
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (!isEditable || uploading) return;
      const files=Array.from(event.clipboardData?.files || []).filter(f=>f.type.startsWith('image/'));
      if(files.length) { event.preventDefault(); void add(files); }
    };
    window.addEventListener('paste',paste,true);
    return () => window.removeEventListener('paste',paste,true);
  },[isEditable,uploading]);
  const move = (index:number,step:number) => {
    const next=[...photos]; [next[index],next[index+step]]=[next[index+step],next[index]]; onChange(next);
  };
  return <div className="border-x border-b border-black p-3 space-y-3 bg-white" onDragOver={e=>{if(isEditable)e.preventDefault();}} onDrop={e=>{if(isEditable){e.preventDefault();void add(Array.from(e.dataTransfer.files));}}}>
    <input ref={input} className="hidden" type="file" accept="image/*,application/pdf" multiple onChange={e=>{void add(Array.from(e.target.files || []));e.target.value='';}} />
    {isEditable && <button type="button" disabled={uploading || photos.length>=6} onClick={()=>input.current?.click()} className="w-full p-3 border border-dashed border-slate-300 rounded-lg text-xs flex gap-2 items-center justify-center disabled:opacity-50"><UploadCloud size={16}/>Tambah foto / PDF <span className="text-slate-500">({photos.length}/6)</span></button>}
    {uploading && <p role="status" className="text-xs text-blue-700">{progress}</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {!photos.length && <p className="text-xs text-center text-slate-500 py-3">{isEditable ? 'Tarik file ke sini atau tempel foto dengan Ctrl+V. Maksimal 3,9 MB per file.' : 'Belum ada lampiran.'}</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{photos.map((photo,i)=><div key={photo.id} className="rounded-lg border border-slate-200 p-2 min-w-0">
      <button type="button" onClick={()=>setPreview(photo)} className="w-full h-24 flex items-center justify-center bg-slate-50 rounded" aria-label={`Pratinjau ${photo.name || photo.caption || `lampiran ${i+1}`}`}>
        {photo.type==='application/pdf' ? <FileText size={36} className="text-red-600"/> : <img src={photo.url} alt={photo.caption || `Lampiran ${i+1}`} className="max-h-24 max-w-full object-contain"/>}
      </button>
      {isEditable ? <input aria-label={`Keterangan lampiran ${i+1}`} value={photo.caption || ''} onChange={e=>onChange(photos.map(p=>p.id===photo.id?{...p,caption:e.target.value}:p))} className="w-full text-[11px] mt-2 border rounded p-1"/> : <p className="text-[11px] break-words mt-2">{photo.caption || photo.name}</p>}
      <div className="flex items-center justify-between mt-2"><span className="text-[10px] text-slate-500">{photo.type==='application/pdf'?'PDF':'Foto'} {i+1}</span><div className="flex gap-1">
        <button type="button" onClick={()=>setPreview(photo)} aria-label={`Buka lampiran ${i+1}`}><Eye size={14}/></button>
        {isEditable && <><button type="button" disabled={i===0 || uploading} onClick={()=>move(i,-1)} aria-label={`Geser lampiran ${i+1} ke kiri`} className="disabled:opacity-20"><ArrowLeft size={14}/></button><button type="button" disabled={i===photos.length-1 || uploading} onClick={()=>move(i,1)} aria-label={`Geser lampiran ${i+1} ke kanan`} className="disabled:opacity-20"><ArrowRight size={14}/></button><button type="button" disabled={uploading} onClick={()=>onChange(photos.filter(p=>p.id!==photo.id))} aria-label={`Lepas lampiran ${i+1}`} className="text-red-700"><X size={14}/></button></>}
      </div></div>
    </div>)}</div>
    {preview && <div role="dialog" aria-modal="true" aria-label="Pratinjau lampiran" className="fixed inset-0 z-50 bg-black/80 flex flex-col p-4" onKeyDown={e=>{if(e.key==='Escape')setPreview(null);}}>
      <div className="flex justify-between items-center text-white mb-3"><span>{preview.name || preview.caption || 'Lampiran'}</span><button autoFocus type="button" onClick={()=>setPreview(null)} aria-label="Tutup pratinjau"><X/></button></div>
      {preview.type==='application/pdf' ? <iframe title={preview.name || 'PDF'} src={preview.url} className="w-full flex-1 bg-white"/> : <img src={preview.url} alt={preview.caption || 'Lampiran'} className="w-full h-[85vh] object-contain"/>}
    </div>}
  </div>;
}
