import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  real,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { media } from "./media";

// ── Media Videos ──────────────────────────────────────────────────────────────
// YouTube/Vimeo videos (trailers, teasers, clips, etc.) associated with a media item.

export const mediaVideos = pgTable(
  "media_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    tmdbKey: text("tmdb_key").notNull(), // YouTube/Vimeo key
    name: text("name").notNull(),
    type: text("type").notNull(), // "Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes", etc
    site: text("site").notNull(), // "YouTube" or "Vimeo"
    official: boolean("official").default(true),
    size: integer("size"), // resolution: 360, 480, 720, 1080
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("uq_media_videos_media_key").on(table.mediaId, table.tmdbKey),
    index("idx_media_videos_media_id").on(table.mediaId),
  ]
);

// ── Media Images ──────────────────────────────────────────────────────────────
// Backdrop, poster and logo images from TMDB for a given media item.
// filePath is stored as `tmdb:/path.jpg` by default (CDN served).
// When TMDB_UPLOAD_TO_STORAGE=true, filePath is the B2 storage path.

export const mediaImages = pgTable(
  "media_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    imageType: text("image_type").notNull(), // "backdrop" | "poster" | "logo"
    filePath: text("file_path").notNull(), // `tmdb:/path.jpg` or B2 path
    width: integer("width"),
    height: integer("height"),
    language: text("language"), // ISO 639-1 e.g. "en", null = language-neutral
    voteAverage: real("vote_average").default(0),
    voteCount: integer("vote_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("uq_media_images_media_type_path").on(table.mediaId, table.imageType, table.filePath),
    index("idx_media_images_media_id").on(table.mediaId),
    index("idx_media_images_type").on(table.mediaId, table.imageType),
  ]
);
