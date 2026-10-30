'use client';
import {createContext,useContext,useEffect,useState,ReactNode} from 'react';
import {supabase} from '@/lib/supabase';
import {setStorageScope,adoptLegacyDataForAdmin} from '@/lib/storageScope';
const Context=createContext({required:false,role:'legacy',email:'',canEdit:true,canDelete:true});
export const useFppAccess=()=>useContext(Context);
export default function AuthGate({children}:{children:ReactNode}){
 const [required,setRequired]=useState<boolean|null>(null);const [role,setRole]=useState('');const [account,setAccount]=useState('');const [email,setEmail]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  const check=async()=>{
   const mode=await supabase!.rpc('fpp_access_mode');
   if(!active)return;
   if(mode.error?.code==='PGRST202'){setStorageScope('legacy');setRequired(false);return;}
   if(mode.error){setMessage('Akses belum dapat diperiksa. Muat ulang untuk mencoba lagi.');setRequired(true);return;}
   const {data}=await supabase!.auth.getSession();
   if(!active)return;
   if(!data.session){setRequired(true);setRole('');setAccount('');return;}
   const permission=await supabase!.rpc('fpp_role');
   if(!active)return;
   if(permission.error||!permission.data){setRequired(true);setRole('');setAccount(data.session.user.email||'');setMessage('Email ini belum diberi akses FPP. Hubungi admin.');return;}
   const response=await fetch('/api/auth-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:data.session.access_token})});
   if(!active)return;
   if(!response.ok){setMessage('Sesi akses lampiran belum tersedia. Coba masuk kembali.');setRequired(true);setRole('');return;}
   if(permission.data==='admin')adoptLegacyDataForAdmin(data.session.user.id);
   setStorageScope(data.session.user.id);setAccount(data.session.user.email||'');setRole(permission.data);setRequired(true);setMessage('');
  };
  void check();
  const {data:subscription}=supabase!.auth.onAuthStateChange(()=>{window.setTimeout(check,0);});
  const timer=window.setInterval(check,60000);
  return()=>{active=false;subscription.subscription.unsubscribe();window.clearInterval(timer);};
 },[]);
 const logout=async()=>{window.dispatchEvent(new Event('fpp-flush-draft'));await fetch('/api/auth-session',{method:'DELETE'});await supabase!.auth.signOut();setRole('');setAccount('');};
 if(required===null)return <p className="p-6">Memeriksa akses FPP…</p>;
 if(required&&!role)return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><section className="w-full max-w-sm p-6 rounded-2xl border bg-white text-slate-900 space-y-4"><h1 className="text-xl font-semibold">Masuk FPP</h1><p className="text-sm text-slate-600">Gunakan email yang telah diberi akses oleh admin.</p>
 <form className="space-y-3" onSubmit={async event=>{event.preventDefault();setBusy(true);const {error}=await supabase!.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{emailRedirectTo:window.location.origin,shouldCreateUser:true}});setMessage(error?error.message:'Tautan masuk sudah dikirim. Periksa email Anda.');setBusy(false);}}>
 <label className="block text-sm">Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded-lg p-2 mt-1"/></label><button disabled={busy} className="w-full bg-blue-600 text-white rounded-lg p-2 disabled:opacity-50">{busy?'Mengirim…':'Kirim tautan masuk'}</button></form><p role="status" className="text-sm">{message}</p>{account&&<button type="button" onClick={logout} className="text-sm underline">Gunakan akun lain</button>}</section></main>;
 const access={required:!!required,role:required?role:'legacy',email:account,canEdit:!required||['admin','editor'].includes(role),canDelete:!required||role==='admin'};
 return <Context.Provider value={access}>{required&&<div className="no-print bg-slate-900 text-white px-4 py-2 text-xs flex justify-between gap-2"><span>{account} • {role==='viewer'?'Lihat dan cetak':role==='editor'?'Editor':'Admin'}</span><button type="button" onClick={logout}>Keluar</button></div>}{children}</Context.Provider>;
}
