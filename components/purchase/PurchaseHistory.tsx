'use client';
import { useEffect,useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function PurchaseHistory({purchaseId}:{purchaseId:string}) {
 const [entries,setEntries]=useState<any[]>([]); const [error,setError]=useState('');
 useEffect(()=>{let active=true;setEntries([]);setError('');void (async()=>{
  const result=await supabase?.from('fpp_purchase_history').select('id,action,actor_email,changed_at,before_data,after_data').eq('purchase_id',purchaseId).order('changed_at',{ascending:false}).limit(50);
  if(!active)return;
  if(result?.error)setError('Riwayat belum tersedia atau akun tidak memiliki akses.');else setEntries(result?.data || []);
 })();return()=>{active=false;};},[purchaseId]);
 return <section className="no-print rounded-xl border border-slate-300 dark:border-zinc-700 p-3 text-xs space-y-2"><h2 className="font-semibold">Riwayat perubahan</h2>
 {error&&<p role="alert">{error}</p>}{!error&&!entries.length&&<p>Belum ada riwayat untuk FPP ini. Riwayat dicatat setelah fitur diaktifkan.</p>}
 {entries.map(entry=>{const fields=Object.keys(entry.after_data || entry.before_data || {}).filter(key=>!['updated_at','created_at'].includes(key)&&JSON.stringify(entry.before_data?.[key])!==JSON.stringify(entry.after_data?.[key]));return <details key={entry.id} className="border-t border-slate-200 dark:border-zinc-700 pt-2"><summary className="cursor-pointer">{entry.action==='INSERT'?'Dibuat':entry.action==='DELETE'?'Dihapus':'Diubah'} • {new Date(entry.changed_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}<span className="block text-slate-500">{entry.actor_email || 'Sistem'}</span></summary><p className="mt-2">Bagian berubah: {fields.map(field=>field.replaceAll('_',' ')).join(', ')}</p></details>;})}
 </section>;
}
