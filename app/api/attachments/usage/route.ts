import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, r2Ready } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const readUsage = unstable_cache(async (bucket: string) => {
  const client = r2Client();
  let bytes = 0;
  let objects = 0;
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const object of page.Contents || []) {
      bytes += object.Size || 0;
      objects++;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
    if (page.IsTruncated && !token) throw new Error('Incomplete storage listing');
  } while (token);
  return { bytes, objects, updatedAt: new Date().toISOString() };
}, ['r2-storage-usage'], { revalidate: 300, tags: ['r2-storage-usage'] });

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  if (!r2Ready()) return NextResponse.json({ enabled: false }, { headers });
  try {
    return NextResponse.json({ enabled: true, ...await readUsage(process.env.R2_BUCKET_NAME!), freeTierBytes: 10_000_000_000 }, { headers });
  } catch {
    return NextResponse.json({ error: 'Pemakaian R2 belum dapat dimuat.' }, { status: 502, headers });
  }
}
