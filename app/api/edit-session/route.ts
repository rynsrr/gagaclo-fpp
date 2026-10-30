import { NextRequest, NextResponse } from 'next/server';
import { r2Ready, sign } from '@/lib/r2';
import { timingSafeEqual, createHash } from 'crypto';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Origin ditolak.' }, { status: 403 });
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.FPP_EDIT_PASSWORD || 'takbir';
  const hash = (value: string) => createHash('sha256').update(value).digest();
  if (typeof password !== 'string' || !timingSafeEqual(hash(password.trim().toLowerCase()), hash(expected))) return NextResponse.json({ error: 'Password salah!' }, { status: 401 });
  const response = NextResponse.json({ success: true });
  if (r2Ready()) {
    const expires = String(Date.now() + 8 * 60 * 60 * 1000);
    response.cookies.set('fpp_edit', `${expires}.${sign(`edit:${expires}`)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 });
  }
  return response;
}
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('fpp_edit');
  return response;
}
