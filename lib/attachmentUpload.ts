export async function uploadAttachment(dataUrl: string): Promise<string> {
  const status = await fetch('/api/attachments', { cache: 'no-store' });
  if (!status.ok) throw new Error('Status penyimpanan lampiran tidak tersedia.');
  if (!(await status.json()).enabled) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append('file', blob, 'attachment.jpg');
  const response = await fetch('/api/attachments', { method: 'POST', body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unggah lampiran gagal.');
  return result.url;
}
