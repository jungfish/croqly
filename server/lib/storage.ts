import sharp from 'sharp';
import { getSupabaseAdmin } from './supabaseAdmin.js';

const BUCKET = 'recipe-illustrations';
let bucketReady = false;

// Card/grid thumbnails never render wider than ~240 CSS px — 480w covers
// that at 2x DPR without shipping the full hero image into a tiny slot.
const THUMB_WIDTH = 480;
// The parallax hero is full-bleed but capped in height and stylized rather
// than photo-critical, so 1600w is plenty even on large/retina screens.
const HERO_WIDTH = 1600;
const WEBP_QUALITY = 75;

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

// Storage keys reject spaces/accents/non-ASCII — normalize before uploading.
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-');
}

export interface IllustrationUrls {
  full: string;
  thumb: string;
}

async function uploadVariant(buffer: Buffer, key: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase Storage is not configured — set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY in .env.');
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType: 'image/webp', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

// Converts a source image (any format sharp can read) into the two WebP
// variants the app actually uses, and uploads both. `baseName` should not
// include an extension — it's shared between the two output keys.
export async function uploadIllustrationVariants(source: Buffer, baseName: string): Promise<IllustrationUrls> {
  await ensureBucket();

  const base = slugify(baseName);
  const [fullBuffer, thumbBuffer] = await Promise.all([
    sharp(source).resize({ width: HERO_WIDTH, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer(),
    sharp(source).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer(),
  ]);

  const [full, thumb] = await Promise.all([
    uploadVariant(fullBuffer, `${base}-full.webp`),
    uploadVariant(thumbBuffer, `${base}-thumb.webp`),
  ]);

  return { full, thumb };
}

// Uploads a base64-encoded source image (as returned by OpenAI) as WebP
// full/thumb variants and returns their permanent public URLs — used to
// replace OpenAI's ephemeral image URLs, which expire and would otherwise
// leave saved recipes with a broken illustration after about an hour.
export async function uploadIllustration(base64: string, filename: string): Promise<IllustrationUrls> {
  const buffer = Buffer.from(base64, 'base64');
  return uploadIllustrationVariants(buffer, filename.replace(/\.[a-zA-Z0-9]+$/, ''));
}
