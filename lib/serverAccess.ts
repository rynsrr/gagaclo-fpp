import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { supabaseUrl, supabaseAnonKey } from './supabase';
import { validSession } from './r2';

export function accessClient(token?: string) {
 return createClient(supabaseUrl,supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false},global:token?{headers:{Authorization:`Bearer ${token}`}}:undefined});
}
export async function accessMode() {
 const {data,error}=await accessClient().rpc('fpp_access_mode');
 if(error?.code==='PGRST202')return false;
 if(error)throw new Error('Access control unavailable');
 return data===true;
}
export async function allowed(request:NextRequest,write=false) {
 if(!await accessMode())return write?validSession(request.cookies.get('fpp_edit')?.value):true;
 const token=request.headers.get('authorization')?.replace(/^Bearer /i,'') || request.cookies.get('fpp_auth')?.value;
 if(!token)return false;
 const client=accessClient(token);
 const {data,error}=await client.auth.getUser(token);
 if(error||!data.user)return false;
 const role=await client.rpc('fpp_role');
 return !role.error && (write?['admin','editor']:['admin','editor','viewer']).includes(role.data);
}
