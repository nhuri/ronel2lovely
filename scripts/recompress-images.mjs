// One-off maintenance: shrink existing Supabase Storage images in place.
// New uploads are already compressed client-side (src/lib/compress-image.ts,
// maxSizeMB 0.3 / maxWidthOrHeight 800) but the historical Airtable import
// (upload_images.py / migrate_images.py) uploaded raw, uncompressed photos.
// This rewrites each object at its existing path/URL, so no DB changes needed.
//
// Usage:
//   node --env-file=.env.local scripts/recompress-images.mjs --dry-run
//   node --env-file=.env.local scripts/recompress-images.mjs

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKETS = ["candidate-images", "profile-pictures"];
const MAX_DIMENSION = 800;
const TARGET_BYTES = 300 * 1024; // matches client-side compressImage target (0.3MB)
const SKIP_IF_UNDER_BYTES = 320 * 1024; // already close enough to target, don't bother
const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function listAllFiles(bucket) {
  const files = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list("", { limit, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    files.push(...data.filter((f) => f.id !== null));
    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

function extFormat(path) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return { format: "jpeg", contentType: "image/jpeg" };
  if (ext === "png") return { format: "png", contentType: "image/png" };
  if (ext === "webp") return { format: "webp", contentType: "image/webp" };
  return null; // gif / unknown — leave untouched
}

async function compressToTarget(buffer, format) {
  const base = sharp(buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true });

  let quality = 82;
  let out = buffer;
  for (let i = 0; i < 6; i++) {
    if (format === "png") {
      out = await base.clone().png({ quality, compressionLevel: 9 }).toBuffer();
    } else if (format === "webp") {
      out = await base.clone().webp({ quality }).toBuffer();
    } else {
      out = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    }
    if (out.length <= TARGET_BYTES || quality <= 40) break;
    quality -= 10;
  }
  return out;
}

async function run() {
  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const bucket of BUCKETS) {
    console.log(`\n=== Bucket: ${bucket} ===`);
    const files = await listAllFiles(bucket);
    console.log(`${files.length} files found`);

    let i = 0;
    for (const file of files) {
      i++;
      const path = file.name;
      const sizeBefore = file.metadata?.size ?? 0;

      const fmt = extFormat(path);
      if (!fmt) {
        skipped++;
        continue;
      }
      if (sizeBefore > 0 && sizeBefore <= SKIP_IF_UNDER_BYTES) {
        skipped++;
        continue;
      }

      try {
        const { data: blob, error: dlError } = await supabase.storage.from(bucket).download(path);
        if (dlError || !blob) throw dlError ?? new Error("empty download");
        const buffer = Buffer.from(await blob.arrayBuffer());

        const compressed = await compressToTarget(buffer, fmt.format);

        if (compressed.length >= buffer.length) {
          skipped++;
          continue;
        }

        totalBefore += buffer.length;
        totalAfter += compressed.length;

        if (DRY_RUN) {
          console.log(`[dry-run] ${bucket}/${path}: ${buffer.length}B -> ${compressed.length}B`);
        } else {
          const { error: upError } = await supabase.storage
            .from(bucket)
            .upload(path, compressed, { contentType: fmt.contentType, upsert: true });
          if (upError) throw upError;
          console.log(`${bucket}/${path}: ${buffer.length}B -> ${compressed.length}B`);
        }
        processed++;
      } catch (err) {
        console.error(`FAILED ${bucket}/${path}:`, err?.message ?? err);
        failed++;
      }

      if (i % 100 === 0) console.log(`  ...${i}/${files.length} checked`);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Processed: ${processed}, skipped: ${skipped}, failed: ${failed}`);
  console.log(`Total before: ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Total after:  ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Saved:        ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)} MB`);
  if (DRY_RUN) console.log("(dry run — no files were modified, pass without --dry-run to apply)");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
