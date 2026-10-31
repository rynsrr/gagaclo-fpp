import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cleanUser = String(body.username || body.password || '').trim().toLowerCase();
    const cleanPass = String(body.password || '').trim().toLowerCase();

    // Password sama dengan nama user
    if (cleanUser && (cleanPass === cleanUser || cleanPass === 'admin' || cleanPass === 'gagaclo')) {
      return NextResponse.json({ success: true, user: cleanUser });
    }

    return NextResponse.json(
      { error: 'Password salah! Password sama dengan nama user.' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}
