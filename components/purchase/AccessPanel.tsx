'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
export default function AccessPanel(){
 const [role,setRole]=useState(''); const [open,setOpen]=useState(false); const [members,setMembers]=useState<any[]>([]);const [email,setEmail]=useState('');const [permission,setPermission]=useState('viewer');const [message,setMessage]=useState('');
 const load=async()=>{const {data,error}=await supabase!.from('fpp_access').select('email,role').order('email');if(error)setMessage(error.message);else setMembers(data||[]);};
 useEffect(()=>{void supabase?.rpc('fpp_role').then(({data})=>setRole(data||''));},[]);
 if(role!=='admin')return null;
 return <section className="rounded-xl border border-slate-200 dark:border-zinc-800 p-3 text-xs space-y-3"><button type="button" onClick={()=>{setOpen(!open);if(!open)void load();}} className="font-semibold">{open?'Tutup pengaturan pengguna':'Kelola akses pengguna'}</button>
 {open&&<><p>Admin: kelola akses dan hapus FPP. Editor: buat dan edit. Viewer: lihat dan cetak.</p>
 {members.map(member=><div key={member.email} className="flex items-center justify-between gap-2"><span className="break-all">{member.email}</span><span>{member.role}</span><button type="button" onClick={()=>{setEmail(member.email);setPermission(member.role);}} className="underline">Ubah</button><button type="button" onClick={async()=>{if(!confirm(`Cabut akses ${member.email}?`))return;const {error}=await supabase!.from('fpp_access').delete().eq('email',member.email);setMessage(error?error.message:'Akses dicabut.');if(!error)void load();}} className="text-red-600">Cabut</button></div>)}
 <form className="space-y-2" onSubmit={async event=>{event.preventDefault();setMessage('Menyimpan…');const {error}=await supabase!.from('fpp_access').upsert({email:email.trim().toLowerCase(),role:permission});setMessage(error?error.message:'Akses tersimpan. Pengguna dapat masuk melalui email tersebut.');if(!error){setEmail('');void load();}}}>
 <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} aria-label="Email pengguna" placeholder="Email pengguna" className="w-full rounded border bg-transparent p-2"/>
 <select value={permission} onChange={e=>setPermission(e.target.value)} aria-label="Izin pengguna" className="w-full rounded border bg-white dark:bg-zinc-900 p-2"><option value="viewer">Lihat dan cetak</option><option value="editor">Buat dan edit</option><option value="admin">Admin</option></select>
 <button className="px-3 py-2 rounded bg-blue-600 text-white">Simpan akses</button></form><p role="status">{message}</p></>}
 </section>;
}
