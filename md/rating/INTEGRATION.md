# Series System Integration Guide

## Files

| File | Action |
|------|--------|
| `schema/series.ts` | Replace `src/db/schema/series.ts` |
| `migrations/0010_series_ratings.sql` | Run in Supabase SQL editor |
| `services/tmdb-series.ts` | New file → `src/services/tmdb-series.ts` |
| `routes/series.ts` | Replace `src/routes/series.ts` |
| `storage-additions.ts` | Add methods to `StorageService` class in `src/services/storage.ts` |

---

## Step 1 — Run migration

```sql
-- In Supabase SQL editor, run: migrations/0010_series_ratings.sql
```

---

## Step 2 — Update schema index

Add `seasonRatings` export to `src/db/schema/index.ts`:

```ts
// Already there, just make sure this line exists:
export * from "./series";
// seasonRatings is now exported from series.ts
```

---

## Step 3 — Update tmdb.ts importMedia

In `syncMedia` (the main import method), after inserting the media record,
add a fire-and-forget call for series:

```ts
// After tx.insert(media)...

if (type === "series") {
  // Fire-and-forget deep sync (seasons + episodes)
  // Don't await — let the user get the series page immediately
  import("./tmdb-series").then(({ deepSyncSeries }) => {
    deepSyncSeries(insertedMedia.id, data.id, slug).catch((err) =>
      logger.warn({ err }, "Background series sync failed")
    );
  });
}
```

---

## Step 4 — Register route in index.ts

```ts
import { seriesRoutes } from "./routes/series";
// Inside the /api/v1 group:
.use(seriesRoutes)
```

---

## Rating Architecture

```
Series overall rating   → `ratings` table (user_id + media_id)  ← unchanged
Season rating           → `season_ratings` table (new)
  source = "manual"     → user explicitly rated the season
  source = "auto"       → calculated avg of episode ratings (recalced on change)
Episode rating          → `episode_progress.rating` ← unchanged
```

**Rule**: A manual season rating is never overwritten by auto-calculation.
Deleting the manual rating re-enables auto.

---

## Image Storage Paths

```
series/{slug}/s{N}/poster.webp          ← season poster (uploaded on sync)
series/{slug}/s{N}/poster-sm.webp       ← small thumbnail
series/{slug}/s{N}/e{N}/still.webp      ← episode still (uploaded lazily)
series/{slug}/s{N}/e{N}/still-sm.webp   ← small thumbnail
```

TMDB paths are stored as `tmdb:/path` until uploaded.
The resolver in `getImageUrl()` already handles `tmdb:` prefix.

---

## On-demand Endpoints

| Endpoint | When to call |
|----------|-------------|
| `POST /series/:id/sync` | After TMDB data update, admin backfills |
| `POST /series/:id/seasons/:N/sync-stills` | To pre-upload stills for a season |

Episode stills are also uploaded lazily — when a user visits a season page,
if > 0 stills are still on TMDB CDN, `uploadSeasonStills` runs in background.
