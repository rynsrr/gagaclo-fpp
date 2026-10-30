import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { allowed } from '@/lib/serverAccess';
import { r2Client, r2Ready, validSignature } from '@/lib/r2';

export const runtime = 'nodejs';
export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  if (!r2Ready()) return new NextResponse(null, { status: 503 });
  if(!await allowed(request))return new NextResponse(null,{status:401});
  const { key } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|pdf)$/.test(key) || !validSignature(`read:${key}`, request.nextUrl.searchParams.get('signature') || '')) return new NextResponse(null, { status: 404 });
  try {
    const object = await r2Client().send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: `attachments/${key}` }));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream(), { headers: { 'Content-Type': key.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
