import { NextRequest, NextResponse } from 'next/server';

const EDIT_ACCOUNTS: Record<string, string> = {
  royan: 'royan',
  ryan: 'ryan',
  amin: 'amin',
  hanami: 'hanami',
  cynara: 'cynara',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cleanUser = String(body.username || body.password || '').trim().toLowerCase();
    const cleanPass = String(body.password || '').trim().toLowerCase();

    // Check if matching account
    if (EDIT_ACCOUNTS[cleanUser] && (cleanPass === cleanUser || cleanPass === EDIT_ACCOUNTS[cleanUser])) {
      return NextResponse.json({ success: true, user: cleanUser });
    }

    return NextResponse.json(
      { error: 'Username atau password salah. Pilihan: royan, ryan, amin, hanami, cynara' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}
