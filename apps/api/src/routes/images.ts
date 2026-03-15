/**
 * Image Proxy Route
 * Proxies images from B2 bucket (private) to hide the bucket URL
 * Fetches directly from B2 using S3 SDK
 */

import { Elysia, t } from "elysia";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// B2 Configuration
const B2_CONFIG = {
  bucket: process.env.B2_BUCKET_NAME || "",
  region: process.env.B2_REGION || "us-east-005",
  endpoint: process.env.B2_ENDPOINT || "",
  keyId: process.env.B2_KEY_ID || "",
  appKey: process.env.B2_APP_KEY || "",
};

// Initialize S3 Client
const s3 = new S3Client({
  region: B2_CONFIG.region,
  endpoint: B2_CONFIG.endpoint,
  credentials: {
    accessKeyId: B2_CONFIG.keyId,
    secretAccessKey: B2_CONFIG.appKey,
  },
  forcePathStyle: true,
});

// Simple in-memory cache for images (optional, helps with performance)
const imageCache = new Map<
  string,
  { buffer: Buffer; contentType: string; timestamp: number }
>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 100;

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of imageCache) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
  // Remove oldest if too many
  if (imageCache.size > MAX_CACHE_SIZE) {
    const oldest = [...imageCache.entries()].sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    for (let i = 0; i < oldest.length - MAX_CACHE_SIZE; i++) {
      imageCache.delete(oldest[i][0]);
    }
  }
}

export const imageRoutes = new Elysia({ prefix: "/images", tags: ["Media"] })

  /**
   * GET /images/*
   * Proxy image from B2 bucket (private bucket access via SDK)
   * Supports paths like:
   * - /images/movies/star-wars-11/poster.webp
   * - /images/series/breaking-bad-1396/backdrop.webp
   */
  .get(
    "/*",
    async ({ params, set }) => {
      // Get the full path from wildcard
      const path = params["*"];

      if (!path) {
        set.status = 400;
        return { error: "Missing image path" };
      }

      // Security: validate path doesn't contain traversal attacks
      if (path.includes("..") || path.includes("//")) {
        set.status = 400;
        return { error: "Invalid path" };
      }

      // Check if B2 is configured
      if (!B2_CONFIG.bucket || !B2_CONFIG.keyId || !B2_CONFIG.appKey) {
        set.status = 500;
        return { error: "Image service not configured" };
      }

      // Check cache first
      const cached = imageCache.get(path);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        set.headers["Content-Type"] = cached.contentType;
        set.headers["Cache-Control"] = "public, max-age=31536000, immutable";
        set.headers["X-Content-Type-Options"] = "nosniff";
        set.headers["X-Cache"] = "HIT";
        return new Response(new Uint8Array(cached.buffer));
      }

      try {
        // Fetch from B2 using S3 SDK (works with private buckets)
        const command = new GetObjectCommand({
          Bucket: B2_CONFIG.bucket,
          Key: path,
        });

        const response = await s3.send(command);

        if (!response.Body) {
          set.status = 404;
          return { error: "Image not found" };
        }

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        const stream = response.Body as Readable;

        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }

        const buffer = Buffer.concat(chunks);
        const contentType = response.ContentType || "image/webp";

        // Cache the result
        imageCache.set(path, { buffer, contentType, timestamp: Date.now() });
        cleanupCache();

        // Set response headers
        set.headers["Content-Type"] = contentType;
        set.headers["Cache-Control"] = "public, max-age=31536000, immutable";
        set.headers["X-Content-Type-Options"] = "nosniff";
        set.headers["X-Cache"] = "MISS";

        return new Response(new Uint8Array(buffer));
      } catch (error: any) {
        if (
          error.name === "NoSuchKey" ||
          error.$metadata?.httpStatusCode === 404
        ) {
          set.status = 404;
          return { error: "Image not found" };
        }

        console.error("Image proxy error:", error);
        set.status = 500;
        return { error: "Failed to fetch image" };
      }
    },
    {
      params: t.Object({
        "*": t.String(),
      }),
    }
  );
