// Maintenance: find Storage files no longer referenced by any candidate.
// Orphans accumulate because image replacement in my-profile/actions.ts used
// to leave the old file behind (fixed in that file — this script clears the
// backlog).
//
// SAFETY MODEL — never hard-deletes in the same run it identifies orphans:
//   1. Default (no flags):    dry run, lists what *would* be quarantined.
//   2. --quarantine:          moves orphans into the private
//                              "orphan-quarantine" bucket (same relative
//                              path, prefixed with their source bucket) and
//                              writes a recovery log to scripts/logs/. Files
//                              are NOT deleted — if this run wrongly flagged
//                              something as an orphan, move it back with
//                              supabase.storage.from("orphan-quarantine").move(...).
//   3. --purge-quarantine:    permanently deletes files that have sat in
//                              orphan-quarantine for at least 30 days
//                              (override with --older-than-days=N). This is
//                              the only irreversible step, and it's a
//                              separate, deliberate run.
//
// Usage:
//   node --env-file=.env.local scripts/cleanup-orphaned-images.mjs
//   node --env-file=.env.local scripts/cleanup-orphaned-images.mjs --quarantine
//   node --env-file=.env.local scripts/cleanup-orphaned-images.mjs --purge-quarantine [--older-than-days=30]

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "logs");

const BUCKETS = ["candidate-images", "profile-pictures"];
const QUARANTINE_BUCKET = "orphan-quarantine";

const args = process.argv.slice(2);
const QUARANTINE = args.includes("--quarantine");
const PURGE = args.includes("--purge-quarantine");
const olderThanArg = args.find((a) => a.startsWith("--older-than-days="));
const OLDER_THAN_DAYS = olderThanArg ? parseInt(olderThanArg.split("=")[1], 10) : 30;

if (args.includes("--delete")) {
  console.error(
    "--delete was renamed to --quarantine (files are moved to a recoverable\n" +
    "quarantine bucket, not deleted outright). Use --purge-quarantine to\n" +
    "actually delete files that have been quarantined for a while."
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function writeLog(name, payload) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const file = path.join(LOG_DIR, `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(`\nLog written: ${file}`);
}

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
      .select("id, image_urls, removed_image_urls")
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

async function runScan() {
  console.log("Fetching all candidate image_urls...");
  const candidates = await fetchAllCandidateImageUrls();

  const referenced = new Map(BUCKETS.map((b) => [b, new Set()]));
  for (const c of candidates) {
    const urls = [...(c.image_urls ?? []), ...(c.removed_image_urls ?? [])];
    for (const url of urls) {
      if (typeof url !== "string") continue;
      for (const bucket of BUCKETS) {
        const p = extractPath(url, bucket);
        if (p) referenced.get(bucket).add(p);
      }
    }
  }

  const orphansByBucket = new Map();
  for (const bucket of BUCKETS) {
    console.log(`\n=== Bucket: ${bucket} ===`);
    const files = await listAllFiles(bucket);
    const refs = referenced.get(bucket);
    const orphans = files.filter((f) => !refs.has(f.name));
    const orphanBytes = orphans.reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);

    console.log(`${files.length} files total, ${refs.size} referenced, ${orphans.length} orphaned (${(orphanBytes / 1024 / 1024).toFixed(1)} MB)`);
    orphansByBucket.set(bucket, orphans);

    if (orphans.length === 0) continue;
    for (const f of orphans.slice(0, 20)) {
      console.log(`  ${f.name} (${f.metadata?.size ?? "?"} bytes)`);
    }
    if (orphans.length > 20) console.log(`  ...and ${orphans.length - 20} more`);
  }

  return orphansByBucket;
}

async function quarantine(orphansByBucket) {
  const moved = [];
  const failed = [];

  // Flat "<bucket>__<path>" naming (no "/") — Supabase Storage's list() does
  // not recurse into subfolders, so a nested "<bucket>/<path>" layout would
  // make quarantined files invisible to purgeQuarantine()'s listing.
  for (const [bucket, orphans] of orphansByBucket) {
    for (const f of orphans) {
      const destPath = `${bucket}__${f.name}`;
      const { error } = await supabase.storage
        .from(bucket)
        .move(f.name, destPath, { destinationBucket: QUARANTINE_BUCKET });

      if (error) {
        console.error(`  Failed to quarantine ${bucket}/${f.name}: ${error.message}`);
        failed.push({ bucket, path: f.name, error: error.message });
      } else {
        moved.push({ bucket, path: f.name, quarantinedTo: destPath, size: f.metadata?.size ?? null, quarantinedAt: new Date().toISOString() });
      }
    }
  }

  console.log(`\nQuarantined ${moved.length} file(s) into "${QUARANTINE_BUCKET}"${failed.length ? `, ${failed.length} failed` : ""}.`);
  console.log(`To restore a file: supabase.storage.from("${QUARANTINE_BUCKET}").move("<bucket>__<path>", "<path>", { destinationBucket: "<bucket>" })`);

  writeLog("quarantine", { moved, failed });
}

async function purgeQuarantine() {
  console.log(`Purging files quarantined for ${OLDER_THAN_DAYS}+ days...`);
  const files = await listAllFiles(QUARANTINE_BUCKET);
  const cutoff = Date.now() - OLDER_THAN_DAYS * 24 * 60 * 60 * 1000;

  // updated_at reflects when move() placed the file here — created_at is the
  // file's original upload date (irrelevant to how long it's been quarantined).
  const toPurge = files.filter((f) => new Date(f.updated_at).getTime() < cutoff);
  console.log(`${files.length} file(s) in quarantine, ${toPurge.length} older than ${OLDER_THAN_DAYS} days.`);

  if (toPurge.length === 0) return;

  const paths = toPurge.map((f) => f.name);
  const { error } = await supabase.storage.from(QUARANTINE_BUCKET).remove(paths);
  if (error) {
    console.error("Purge failed:", error.message);
    return;
  }

  console.log(`Permanently deleted ${paths.length} file(s).`);
  writeLog("purge", { purgedAt: new Date().toISOString(), olderThanDays: OLDER_THAN_DAYS, files: toPurge.map((f) => ({ path: f.name, createdAt: f.created_at, size: f.metadata?.size ?? null })) });
}

async function run() {
  if (PURGE) {
    await purgeQuarantine();
    return;
  }

  const orphansByBucket = await runScan();
  const totalOrphans = [...orphansByBucket.values()].reduce((sum, arr) => sum + arr.length, 0);

  console.log("\n=== Summary ===");
  console.log(`Total orphaned files: ${totalOrphans}`);

  if (totalOrphans === 0) return;

  if (QUARANTINE) {
    await quarantine(orphansByBucket);
  } else {
    console.log("(dry run — pass --quarantine to move these into the recoverable orphan-quarantine bucket)");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
