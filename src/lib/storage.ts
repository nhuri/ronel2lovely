import { createSupabaseAdminClient } from "@/lib/supabase/server";

const EXPIRY_SECONDS = 60 * 60 * 24; // 24 hours

// All private buckets that contain images
const KNOWN_BUCKETS = ["candidate-images", "profile-pictures"] as const;
type KnownBucket = (typeof KNOWN_BUCKETS)[number];

/** Parse a Supabase Storage URL into its bucket + path components */
function extractEntry(url: string): { bucket: KnownBucket; path: string } | null {
  for (const bucket of KNOWN_BUCKETS) {
    for (const kind of ["public", "sign"]) {
      const marker = `/storage/v1/object/${kind}/${bucket}/`;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        return { bucket, path: url.slice(idx + marker.length).split("?")[0] };
      }
    }
  }
  return null;
}

/**
 * Create a single signed URL for any file in a private bucket.
 *
 * @param bucket    - Bucket name, e.g. "candidate-images" or "profile-pictures"
 * @param path      - File path inside the bucket, e.g. "user123/avatar.jpg"
 * @param expiresIn - Expiry in seconds (default: 24 h)
 * @returns Signed URL string, or null on failure
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = EXPIRY_SECONDS
): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Convert an array of stored image URLs to time-limited signed URLs (24h). Handles multiple buckets. */
export async function signImageUrls(urls: string[]): Promise<string[]> {
  if (!urls.length) return [];

  // Parse each URL: [{bucket, path} | null]
  const entries = urls.map(extractEntry);
  if (entries.every((e) => !e)) return urls;

  // Group indices by bucket for batch signing
  const byBucket = new Map<KnownBucket, number[]>();
  entries.forEach((e, i) => {
    if (e) {
      const list = byBucket.get(e.bucket) ?? [];
      list.push(i);
      byBucket.set(e.bucket, list);
    }
  });

  const supabase = createSupabaseAdminClient();
  // signed[i] will hold the signed URL for urls[i] once resolved
  const signed = [...urls];

  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, indices]) => {
      const paths = indices.map((i) => entries[i]!.path);
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, EXPIRY_SECONDS);
      if (error || !data) return;
      indices.forEach((urlIdx, pos) => {
        const signedUrl = data[pos]?.signedUrl;
        if (signedUrl) signed[urlIdx] = signedUrl;
      });
    })
  );

  return signed;
}

/** Sign image_urls on a single candidate-like object */
export async function signCandidateImages<T extends { image_urls?: string[] | null }>(
  c: T
): Promise<T> {
  if (!c.image_urls?.length) return c;
  return { ...c, image_urls: await signImageUrls(c.image_urls) };
}

/**
 * Sign image_urls on an array of candidates in one batch request.
 * Handles multiple buckets and nested candidate_1/candidate_2 on proposal-like objects.
 */
export async function signAllCandidateImages<T extends { image_urls?: string[] | null }>(
  candidates: T[]
): Promise<T[]> {
  if (!candidates.length) return candidates;

  // Collect all URLs across all candidates
  const allUrls: string[] = [];
  const positions: Array<{ ci: number; ii: number }> = [];

  candidates.forEach((c, ci) => {
    (c.image_urls ?? []).forEach((url, ii) => {
      allUrls.push(url);
      positions.push({ ci, ii });
    });
  });

  if (!allUrls.length) return candidates;

  const signedUrls = await signImageUrls(allUrls);

  const result = candidates.map((c) => ({
    ...c,
    image_urls: c.image_urls ? [...c.image_urls] : c.image_urls,
  }));

  positions.forEach(({ ci, ii }, idx) => {
    if (result[ci].image_urls) {
      (result[ci].image_urls as string[])[ii] = signedUrls[idx];
    }
  });

  return result;
}

/** Sign nested candidate images inside proposal objects */
export async function signProposalImages<
  T extends {
    candidate_1?: { image_urls?: string[] | null } | null;
    candidate_2?: { image_urls?: string[] | null } | null;
  }
>(proposals: T[]): Promise<T[]> {
  if (!proposals.length) return proposals;

  const allUrls: string[] = [];
  const positions: Array<{ pi: number; side: "candidate_1" | "candidate_2"; ii: number }> = [];

  proposals.forEach((p, pi) => {
    (["candidate_1", "candidate_2"] as const).forEach((side) => {
      (p[side]?.image_urls ?? []).forEach((url, ii) => {
        allUrls.push(url);
        positions.push({ pi, side, ii });
      });
    });
  });

  if (!allUrls.length) return proposals;

  const signedUrls = await signImageUrls(allUrls);

  const result = proposals.map((p) => ({
    ...p,
    candidate_1: p.candidate_1
      ? { ...p.candidate_1, image_urls: [...(p.candidate_1.image_urls ?? [])] }
      : p.candidate_1,
    candidate_2: p.candidate_2
      ? { ...p.candidate_2, image_urls: [...(p.candidate_2.image_urls ?? [])] }
      : p.candidate_2,
  }));

  positions.forEach(({ pi, side, ii }, idx) => {
    const cand = result[pi][side] as { image_urls: string[] } | null;
    if (cand?.image_urls) cand.image_urls[ii] = signedUrls[idx];
  });

  return result;
}
