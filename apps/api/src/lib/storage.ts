/**
 * B2/S3 Storage Statistics
 * Lists all objects in the bucket to calculate total size and count.
 * Results are cached for 15 minutes to avoid expensive repeated calls.
 */

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const B2_CONFIG = {
  bucket: process.env.B2_BUCKET_NAME || "",
  region: process.env.B2_REGION || "us-east-005",
  endpoint: process.env.B2_ENDPOINT || "",
  keyId: process.env.B2_KEY_ID || "",
  appKey: process.env.B2_APP_KEY || "",
};

const s3 = new S3Client({
  region: B2_CONFIG.region,
  endpoint: B2_CONFIG.endpoint,
  credentials: {
    accessKeyId: B2_CONFIG.keyId,
    secretAccessKey: B2_CONFIG.appKey,
  },
  forcePathStyle: true,
});

interface StorageStats {
  objectCount: number;
  totalSizeBytes: number;
  formattedSize: string;
}

let cache: { stats: StorageStats; fetchedAt: number } | null = null;
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function getStorageStats(): Promise<StorageStats> {
  // Return cached result if still fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.stats;
  }

  if (!B2_CONFIG.bucket || !B2_CONFIG.endpoint || !B2_CONFIG.keyId) {
    return { objectCount: 0, totalSizeBytes: 0, formattedSize: "N/A" };
  }

  let objectCount = 0;
  let totalSizeBytes = 0;
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: B2_CONFIG.bucket,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const response = await s3.send(command);

    for (const obj of response.Contents ?? []) {
      objectCount++;
      totalSizeBytes += obj.Size ?? 0;
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  const stats: StorageStats = {
    objectCount,
    totalSizeBytes,
    formattedSize: formatBytes(totalSizeBytes),
  };

  cache = { stats, fetchedAt: Date.now() };
  return stats;
}
