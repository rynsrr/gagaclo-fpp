import { supabase } from './supabase';

export async function uploadAttachment(input: string | Blob, onProgress?: (progress: number) => void): Promise<string> {
  const status = await fetch('/api/attachments', { cache: 'no-store' });
  if (!status.ok) throw new Error('Status penyimpanan lampiran tidak tersedia.');
  const blob = typeof input === 'string' ? await (await fetch(input)).blob() : input;
  if (!(await status.json()).enabled) {
    if (typeof input === 'string') return input;
    throw new Error('Penyimpanan R2 harus aktif untuk lampiran PDF.');
  }
  if (blob.size > 3_900_000) throw new Error('Ukuran lampiran maksimal 3,9 MB.');
  const form = new FormData();
  form.append('file', blob, blob.type === 'application/pdf' ? 'attachment.pdf' : 'attachment.jpg');
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return new Promise((resolve,reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST','/api/attachments');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => reject(new Error('Koneksi terputus saat unggah. Coba lagi.'));
    xhr.onload = () => {
      let result;
      try { result = JSON.parse(xhr.responseText); } catch { reject(new Error('Respons unggah tidak valid.')); return; }
      if (xhr.status < 200 || xhr.status >= 300) { reject(new Error(result.error || 'Unggah lampiran gagal.')); return; }
      window.dispatchEvent(new Event('fpp-attachments-updated'));
      resolve(result.url);
    };
    xhr.send(form);
  });
}

export async function deleteAttachment(url: string): Promise<boolean> {
  try {
    const match = url.match(/\/api\/attachments\/([a-f0-9-]{36}\.(?:jpg|pdf))/i);
    if (!match) return false;
    const key = match[1];
    const res = await fetch(`/api/attachments/${key}`, { method: 'DELETE' });
    if (res.ok) {
      window.dispatchEvent(new Event('fpp-attachments-updated'));
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Gagal menghapus lampiran:', err);
    return false;
  }
}
