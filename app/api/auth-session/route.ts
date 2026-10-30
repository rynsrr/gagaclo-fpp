import {NextRequest,NextResponse} from 'next/server';
import {accessClient} from '@/lib/serverAccess';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return new NextResponse(null,{status:403});
 const {token}=await request.json().catch(()=>({}));
 if(typeof token!=='string'||token.length>10000)return new NextResponse(null,{status:401});
 const client=accessClient(token);
 const {data,error}=await client.auth.getUser(token);
 const role=await client.rpc('fpp_role');
 if(error||!data.user||role.error||!['admin','editor','viewer'].includes(role.data))return new NextResponse(null,{status:403});
 const response=NextResponse.json({success:true});
 response.cookies.set('fpp_auth',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:3600});
 return response;
}
export async function DELETE(){const response=NextResponse.json({success:true});response.cookies.delete('fpp_auth');response.cookies.delete('fpp_edit');return response;}
