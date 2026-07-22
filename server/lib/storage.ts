import { getSupabaseAdmin } from './supabaseAdmin.js';

const BUCKET = 'recipe-illustrations';
let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    // Ignore "already exists" races from concurrent requests; surface anything else.
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  bucketReady = true;
}

// Uploads a base64-encoded image and returns a permanent public URL — used to
// replace OpenAI's ephemeral image URLs, which expire and would otherwise
// leave saved recipes with a broken illustration after about an hour.
// Storage keys reject spaces/accents/non-ASCII — normalize before uploading.
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-');
}

export async function uploadIllustration(base64: string, filename: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase Storage is not configured — set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY in .env.');
  }
  await ensureBucket();

  const key = slugify(filename);
  const buffer = Buffer.from(base64, 'base64');
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
