// One-off maintenance: find/delete Storage files no longer referenced by any
// candidate. Orphans accumulate because image replacement in my-profile/actions.ts
// used to leave the old file behind (fixed in that file — this script clears the backlog).
//
// Usage:
//   node --env-file=.env.local scripts/cleanup-orphaned-images.mjs           # dry run, lists orphans
//   node --env-file=.env.local scripts/cleanup-orphaned-images.mjs --delete  # actually deletes them

import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["candidate-images", "profile-pictures"];
const DELETE = process.argv.includes("--delete");

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

async function fetchAllCandidateImageUrls() {
  const all = [];
  let from = 0;
  const chunk = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, image_urls")
      .range(from, from + chunk - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < chunk) break;
    from += chunk;
  }
  return all;
}

function extractPath(url, bucket) {
  for (const kind of ["public", "sign"]) {
    const marker = `/storage/v1/object/${kind}/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) return url.slice(idx + marker.length).split("?")[0];
  }
  return null;
}

async function run() {
  console.log("Fetching all candidate image_urls...");
  const candidates = await fetchAllCandidateImageUrls();

  const referenced = new Map(BUCKETS.map((b) => [b, new Set()]));
  for (const c of candidates) {
    for (const url of c.image_urls ?? []) {
      for (const bucket of BUCKETS) {
        const path = extractPath(url, bucket);
        if (path) referenced.get(bucket).add(path);
      }
    }
  }

  let totalOrphanBytes = 0;
  let totalOrphanCount = 0;

  for (const bucket of BUCKETS) {
    console.log(`\n=== Bucket: ${bucket} ===`);
    const files = await listAllFiles(bucket);
    const refs = referenced.get(bucket);
    const orphans = files.filter((f) => !refs.has(f.name));
    const orphanBytes = orphans.reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);

    console.log(`${files.length} files total, ${refs.size} referenced, ${orphans.length} orphaned (${(orphanBytes / 1024 / 1024).toFixed(1)} MB)`);

    totalOrphanBytes += orphanBytes;
    totalOrphanCount += orphans.length;

    if (orphans.length === 0) continue;

    if (!DELETE) {
      for (const f of orphans.slice(0, 20)) {
        console.log(`  ${f.name} (${f.metadata?.size ?? "?"} bytes)`);
      }
      if (orphans.length > 20) console.log(`  ...and ${orphans.length - 20} more`);
    } else {
      const paths = orphans.map((f) => f.name);
      for (let i = 0; i < paths.length; i += 1000) {
        const chunk = paths.slice(i, i + 1000);
        const { error: rmError } = await supabase.storage.from(bucket).remove(chunk);
        if (rmError) console.error(`Failed to remove chunk:`, rmError.message);
      }
      console.log(`Deleted ${paths.length} orphaned files from ${bucket}`);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total orphaned files: ${totalOrphanCount}`);
  console.log(`Total orphaned size:  ${(totalOrphanBytes / 1024 / 1024).toFixed(1)} MB`);
  if (!DELETE) console.log("(dry run — pass --delete to actually remove these files)");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
