"use server";

import { signImageUrls } from "@/lib/storage";

/**
 * Sign image URLs for a batch of candidates in one request.
 * Used to lazily sign only the candidates visible on the current admin grid page,
 * instead of signing all candidates up front (which caused Egress overage — see 3c0880c).
 */
export async function signCandidateImageUrls(
  urlsByCandidate: Record<number, string[]>
): Promise<Record<number, string[]>> {
  const ids = Object.keys(urlsByCandidate).map(Number);
  if (!ids.length) return {};

  const allUrls: string[] = [];
  const ranges: Record<number, [number, number]> = {};
  let cursor = 0;
  for (const id of ids) {
    const urls = urlsByCandidate[id];
    ranges[id] = [cursor, cursor + urls.length];
    allUrls.push(...urls);
    cursor += urls.length;
  }

  const signed = await signImageUrls(allUrls);

  const result: Record<number, string[]> = {};
  for (const id of ids) {
    const [start, end] = ranges[id];
    result[id] = signed.slice(start, end);
  }
  return result;
}
