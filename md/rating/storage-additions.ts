// ============================================================
// ADD THESE METHODS TO src/services/storage.ts
// inside the StorageService class
// ============================================================

/**
 * Upload a season poster (same dimensions as a movie poster).
 * Stored at: series/{mediaSlug}/s{number}/poster.webp
 * Also creates a small thumbnail at s{number}/poster-sm.webp
 */
async uploadSeasonPoster(
  buffer: ArrayBuffer,
  folder: string // e.g. "series/breaking-bad/s1"
): Promise<{ path: string; paths: { original: string; small: string } }> {
  const input = Buffer.from(buffer);

  const original = await sharp(input)
    .resize({ width: 500, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const small = await sharp(input)
    .resize({ width: 200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const originalPath = `${folder}/poster.webp`;
  const smallPath    = `${folder}/poster-sm.webp`;

  await Promise.all([
    this.upload(original, originalPath, "image/webp"),
    this.upload(small,    smallPath,    "image/webp"),
  ]);

  return { path: originalPath, paths: { original: originalPath, small: smallPath } };
}

/**
 * Upload an episode still (16:9 horizontal screenshot).
 * Stored at: series/{mediaSlug}/s{N}/e{N}/still.webp
 * Also creates a small thumbnail for list/grid use.
 */
async uploadEpisodeStill(
  buffer: ArrayBuffer,
  folder: string // e.g. "series/breaking-bad/s1/e1"
): Promise<{ path: string; paths: { original: string; small: string } }> {
  const input = Buffer.from(buffer);

  const original = await sharp(input)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const small = await sharp(input)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const originalPath = `${folder}/still.webp`;
  const smallPath    = `${folder}/still-sm.webp`;

  await Promise.all([
    this.upload(original, originalPath, "image/webp"),
    this.upload(small,    smallPath,    "image/webp"),
  ]);

  return { path: originalPath, paths: { original: originalPath, small: smallPath } };
}
