import { NextRequest } from 'next/server';

export function accessClient() {
  return null;
}

export async function accessMode() {
  return false;
}

export async function allowed(_request?: NextRequest, _write = false) {
  return true;
}
