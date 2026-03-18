import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { logger } from "../utils/logger";

// ============================================================================
// Configuration
// ============================================================================

const B2_CONFIG = {
  bucket: process.env.B2_BUCKET_NAME || "",
  region: process.env.B2_REGION || "us-east-005",
  endpoint: process.env.B2_ENDPOINT || "",
  keyId: process.env.B2_KEY_ID || "",
  appKey: process.env.B2_APP_KEY || "",
  publicUrl: process.env.B2_PUBLIC_URL || "",
};

// CDN URL (para futuro uso com Cloudflare, etc)
// Por enquanto usa proxy da API: /api/v1/images/{path}
const CDN_URL = process.env.CDN_URL || "";

// ============================================================================
// Image Sizes
// ============================================================================

const IMAGE_SIZES = {
  poster: {
    original: { width: 500, quality: 85 },
    small: { width: 200, quality: 80 },
  },
  backdrop: {
    original: { width: 1280, quality: 85 },
    small: { width: 780, quality: 80 },
  },
} as const;

// ============================================================================
// Storage Service
// ============================================================================

export class StorageService {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: B2_CONFIG.region,
      endpoint: B2_CONFIG.endpoint,
      credentials: {
        accessKeyId: B2_CONFIG.keyId,
        secretAccessKey: B2_CONFIG.appKey,
      },
      forcePathStyle: true,
    });
  }

  /**
   * Check if B2 is properly configured
   */
  isConfigured(): boolean {
    return !!(
      B2_CONFIG.bucket &&
      B2_CONFIG.endpoint &&
      B2_CONFIG.keyId &&
      B2_CONFIG.appKey
    );
  }

  /**
   * Get the URL for accessing an image
   * Uses CDN if configured, otherwise API proxy for private buckets
   */
  getImageUrl(path: string): string {
    if (!path) return "";

    // Handle TMDB fallback paths (starts with "tmdb:")
    if (path.startsWith("tmdb:")) {
      const tmdbPath = path.replace("tmdb:", "");
      return `https://image.tmdb.org/t/p/w500${tmdbPath}`;
    }

    // Use CDN if configured (e.g., Cloudflare)
    if (CDN_URL) {
      return `${CDN_URL}/${path}`;
    }

    // Use API proxy for private B2 bucket
    // This returns a relative path that the frontend should prefix with API_URL
    // e.g., /api/v1/images/movies/oppenheimer/poster.webp
    const API_BASE =
      process.env.API_PUBLIC_URL || "http://localhost:3001/api/v1";
    return `${API_BASE}/images/${path}`;
  }

  /**
   * Upload a file to B2 with retry
   */
  private async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
    retries = 3
  ): Promise<{ path: string }> {
    if (!this.isConfigured()) {
      logger.warn("B2 not configured, skipping upload");
      return { path: "" };
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: B2_CONFIG.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
          })
        );

        logger.info({ key, size: buffer.length }, "File uploaded to B2");
        return { path: key };
      } catch (error) {
        if (attempt === retries) {
          logger.error({ error, key }, "B2 upload failed after retries");
          throw error;
        }
        // Wait before retry
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }

    throw new Error("Upload failed");
  }

  /**
   * Optimize and upload a poster image
   * Creates both original and small sizes
   */
  async uploadPoster(
    buffer: ArrayBuffer,
    folder: string
  ): Promise<{ path: string; paths: { original: string; small: string } }> {
    const input = Buffer.from(buffer);

    // Optimize original size
    const original = await sharp(input)
      .resize({
        width: IMAGE_SIZES.poster.original.width,
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_SIZES.poster.original.quality })
      .toBuffer();

    // Create small thumbnail
    const small = await sharp(input)
      .resize({
        width: IMAGE_SIZES.poster.small.width,
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_SIZES.poster.small.quality })
      .toBuffer();

    // Upload both
    const originalPath = `${folder}/poster.webp`;
    const smallPath = `${folder}/poster-sm.webp`;

    await Promise.all([
      this.upload(original, originalPath, "image/webp"),
      this.upload(small, smallPath, "image/webp"),
    ]);

    return {
      path: originalPath,
      paths: { original: originalPath, small: smallPath },
    };
  }

  /**
   * Optimize and upload a backdrop image
   */
  async uploadBackdrop(
    buffer: ArrayBuffer,
    folder: string
  ): Promise<{ path: string }> {
    const input = Buffer.from(buffer);

    const optimized = await sharp(input)
      .resize({
        width: IMAGE_SIZES.backdrop.original.width,
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_SIZES.backdrop.original.quality })
      .toBuffer();

    const path = `${folder}/backdrop.webp`;
    await this.upload(optimized, path, "image/webp");

    return { path };
  }

  /**
   * Optimize and upload a profile photo (for cast/crew)
   */
  async uploadProfilePhoto(
    buffer: ArrayBuffer,
    folder: string
  ): Promise<{ path: string }> {
    const input = Buffer.from(buffer);

    const optimized = await sharp(input)
      .resize({
        width: 185, // Standard profile size
        height: 278,
        fit: "cover",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const path = `${folder}/profile.webp`;
    await this.upload(optimized, path, "image/webp");

    return { path };
  }

  /**
   * Optimize and upload a user avatar (square)
   * Creates both original (400px) and small (80px) sizes
   */
  async uploadAvatar(
    buffer: ArrayBuffer,
    folder: string
  ): Promise<{ path: string; paths: { original: string; small: string } }> {
    const input = Buffer.from(buffer);

    const original = await sharp(input)
      .resize({ width: 400, height: 400, fit: "cover", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const small = await sharp(input)
      .resize({ width: 80, height: 80, fit: "cover", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const originalPath = `${folder}/avatar.webp`;
    const smallPath = `${folder}/avatar-sm.webp`;

    await Promise.all([
      this.upload(original, originalPath, "image/webp"),
      this.upload(small, smallPath, "image/webp"),
    ]);

    return {
      path: originalPath,
      paths: { original: originalPath, small: smallPath },
    };
  }

  /**
   * Optimize and upload a user profile cover/banner
   * Wide format (1920px max width)
   */
  async uploadCover(
    buffer: ArrayBuffer,
    folder: string
  ): Promise<{ path: string }> {
    const input = Buffer.from(buffer);

    const optimized = await sharp(input)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const path = `${folder}/cover.webp`;
    await this.upload(optimized, path, "image/webp");

    return { path };
  }

  /**
   * Check if a file exists in B2
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: B2_CONFIG.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file from B2
   */
  async delete(key: string): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: B2_CONFIG.bucket,
          Key: key,
        })
      );
      logger.info({ key }, "File deleted from B2");
    } catch (error) {
      logger.error({ error, key }, "Failed to delete file from B2");
    }
  }

  /**
   * Get direct B2 URL (internal use)
   */
  getDirectUrl(key: string): string {
    if (B2_CONFIG.publicUrl) {
      return `${B2_CONFIG.publicUrl}/${key}`;
    }
    return `https://${B2_CONFIG.bucket}.s3.${B2_CONFIG.region}.backblazeb2.com/${key}`;
  }
}

export const storageService = new StorageService();
