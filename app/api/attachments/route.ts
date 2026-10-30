import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';
import { r2Client, r2Ready, sign, validSession } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json({ enabled: r2Ready() }, { headers: { 'Cache-Control': 'no-store' } }); }
export async function POST(request: NextRequest) {
  if (!r2Ready()) return NextResponse.json({ error: 'R2 belum dikonfigurasi.' }, { status: 503 });
  if (request.headers.get('origin') !== request.nextUrl.origin || !validSession(request.cookies.get('fpp_edit')?.value)) return NextResponse.json({ error: 'Buka ulang mode edit untuk mengunggah lampiran.' }, { status: 401 });
  const size = Number(request.headers.get('content-length'));
  if (!Number.isFinite(size) || size > 4_000_000) return NextResponse.json({ error: 'Maksimal foto terkompresi 4 MB.' }, { status: 413 });
  try {
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || !file.size || file.size > 3_900_000 || file.type !== 'image/jpeg') return NextResponse.json({ error: 'Lampiran harus berupa foto JPEG maksimal 3,9 MB.' }, { status: 400 });
    const body = Buffer.from(await file.arrayBuffer());
    if (body[0] !== 0xff || body[1] !== 0xd8 || body[2] !== 0xff) return NextResponse.json({ error: 'Format foto tidak valid.' }, { status: 400 });
    const key = `${randomUUID()}.jpg`;
    await r2Client().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: `attachments/${key}`, Body: body, ContentType: 'image/jpeg' }));
    revalidateTag('r2-storage-usage');
    return NextResponse.json({ url: `/api/attachments/${key}?signature=${sign(`read:${key}`)}` });
  } catch {
    return NextResponse.json({ error: 'Unggah R2 gagal. Coba lagi.' }, { status: 502 });
  }
}
