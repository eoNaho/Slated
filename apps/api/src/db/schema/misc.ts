import {
  pgTable,
  uuid,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { media } from "./media";

// Tags
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  usageCount: integer("usage_count").default(0),
});

// Streaming Services
export const streamingServices = pgTable("streaming_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  tmdbId: integer("tmdb_id").unique(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logoPath: text("logo_path"),
});

// Media Streaming (where to watch)
export const mediaStreaming = pgTable(
  "media_streaming",
  {
    mediaId: uuid("media_id")
      .references(() => media.id, { onDelete: "cascade" })
      .notNull(),
    serviceId: uuid("service_id")
      .references(() => streamingServices.id, { onDelete: "cascade" })
      .notNull(),
    country: text("country").default("US").notNull(),
    url: text("url"),
  },
  (table) => [
    primaryKey({ columns: [table.mediaId, table.serviceId, table.country] }),
    index("idx_media_streaming_media").on(table.mediaId),
  ]
);
