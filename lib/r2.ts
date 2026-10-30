import { createHmac, timingSafeEqual } from 'crypto';
import { S3Client } from '@aws-sdk/client-s3';

export const r2Ready = () => Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
export function r2Client() {
  if (!r2Ready()) throw new Error('R2 belum dikonfigurasi.');
  return new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
}
export function sign(value: string) {
  if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2 belum dikonfigurasi.');
  return createHmac('sha256', process.env.R2_SECRET_ACCESS_KEY).update(value).digest('hex');
}
export function validSignature(value: string, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(sign(value), 'hex'), Buffer.from(signature, 'hex'));
}
export function validSession(cookie?: string) {
  const [expires, signature] = (cookie || '').split('.');
  return /^\d+$/.test(expires || '') && Number(expires) > Date.now() && validSignature(`edit:${expires}`, signature || '');
}
