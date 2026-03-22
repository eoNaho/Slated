import { Elysia, t } from "elysia";
import {
  db,
  stories,
  storyHighlights,
  storyHighlightItems,
  user as userTable,
  eq,
  and,
  desc,
  asc,
  count,
  inArray,
  sql,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { storageService } from "../services/storage";

export const storyHighlightsRoutes = new Elysia({ prefix: "/story-highlights", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get highlights for a user profile (public)
  .get(
    "/user/:username",
    async ({ params, set }) => {
      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      const highlights = await db
        .select()
        .from(storyHighlights)
        .where(eq(storyHighlights.userId, targetUser.id))
        .orderBy(asc(storyHighlights.position), asc(storyHighlights.createdAt));

      if (highlights.length === 0) return { data: [] };

      // Eagerly load first 3 story previews per highlight
      const highlightIds = highlights.map((h) => h.id);
      const items = await db
        .select({
          highlightId: storyHighlightItems.highlightId,
          story: stories,
        })
        .from(storyHighlightItems)
        .innerJoin(stories, eq(storyHighlightItems.storyId, stories.id))
        .where(inArray(storyHighlightItems.highlightId, highlightIds))
        .orderBy(asc(storyHighlightItems.position));

      // Group items by highlight
      const itemsByHighlight: Record<string, typeof items> = {};
      for (const item of items) {
        if (!itemsByHighlight[item.highlightId]) itemsByHighlight[item.highlightId] = [];
        itemsByHighlight[item.highlightId].push(item);
      }

      return {
        data: highlights.map((h) => ({
          ...h,
          previewStories: (itemsByHighlight[h.id] ?? []).slice(0, 3).map((i) => i.story),
          storyCount: (itemsByHighlight[h.id] ?? []).length,
        })),
      };
    },
    { params: t.Object({ username: t.String() }) }
  )

  // Get full stories in a highlight
  .get(
    "/:id",
    async ({ params, set }) => {
      const [highlight] = await db
        .select()
        .from(storyHighlights)
        .where(eq(storyHighlights.id, params.id))
        .limit(1);

      if (!highlight) {
        set.status = 404;
        return { error: "Highlight not found" };
      }

      const items = await db
        .select({ story: stories })
        .from(storyHighlightItems)
        .innerJoin(stories, eq(storyHighlightItems.storyId, stories.id))
        .where(eq(storyHighlightItems.highlightId, params.id))
        .orderBy(asc(storyHighlightItems.position));

      return { data: { highlight, stories: items.map((i) => i.story) } };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Create highlight
  .post(
    "/",
    async (ctx: any) => {
      const { user, body } = ctx;

      const [highlight] = await db
        .insert(storyHighlights)
        .values({
          userId: user.id,
          name: body.name,
          coverImageUrl: body.cover_image_url ?? null,
        })
        .returning();

      // Add initial stories if provided
      if (body.story_ids?.length) {
        await db.insert(storyHighlightItems).values(
          body.story_ids.map((storyId: string, i: number) => ({
            highlightId: highlight.id,
            storyId,
            position: i,
          }))
        ).onConflictDoNothing();
      }

      return { data: highlight };
    },
    {
      requireAuth: true,
      body: t.Object({
        name: t.String({ maxLength: 50 }),
        cover_image_url: t.Optional(t.String()),
        story_ids: t.Optional(t.Array(t.String())),
      }),
    }
  )

  // Update highlight
  .patch(
    "/:id",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [existing] = await db
        .select({ id: storyHighlights.id, userId: storyHighlights.userId })
        .from(storyHighlights)
        .where(eq(storyHighlights.id, params.id))
        .limit(1);

      if (!existing) { set.status = 404; return { error: "Highlight not found" }; }
      if (existing.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      const updates: Partial<typeof storyHighlights.$inferInsert> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.cover_image_url !== undefined) updates.coverImageUrl = body.cover_image_url;
      if (body.position !== undefined) updates.position = body.position;

      const [updated] = await db
        .update(storyHighlights)
        .set(updates)
        .where(eq(storyHighlights.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ maxLength: 50 })),
        cover_image_url: t.Optional(t.Nullable(t.String())),
        position: t.Optional(t.Number()),
      }),
    }
  )

  // Delete highlight
  .delete(
    "/:id",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [existing] = await db
        .select({ id: storyHighlights.id, userId: storyHighlights.userId })
        .from(storyHighlights)
        .where(eq(storyHighlights.id, params.id))
        .limit(1);

      if (!existing) { set.status = 404; return { error: "Highlight not found" }; }
      if (existing.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      await db.delete(storyHighlights).where(eq(storyHighlights.id, params.id));

      set.status = 204;
      return null;
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // Add stories to highlight
  .post(
    "/:id/items",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [existing] = await db
        .select({ id: storyHighlights.id, userId: storyHighlights.userId })
        .from(storyHighlights)
        .where(eq(storyHighlights.id, params.id))
        .limit(1);

      if (!existing) { set.status = 404; return { error: "Highlight not found" }; }
      if (existing.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      // Get current max position
      const [{ maxPos }] = await db
        .select({ maxPos: sql<number>`COALESCE(MAX(${storyHighlightItems.position}), -1)` })
        .from(storyHighlightItems)
        .where(eq(storyHighlightItems.highlightId, params.id));

      const startPos = (maxPos ?? -1) + 1;
      await db.insert(storyHighlightItems).values(
        body.story_ids.map((storyId: string, i: number) => ({
          highlightId: params.id,
          storyId,
          position: startPos + i,
        }))
      ).onConflictDoNothing();

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({ story_ids: t.Array(t.String()) }),
    }
  )

  // Remove story from highlight
  .delete(
    "/:id/items/:storyId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [existing] = await db
        .select({ userId: storyHighlights.userId })
        .from(storyHighlights)
        .where(eq(storyHighlights.id, params.id))
        .limit(1);

      if (!existing) { set.status = 404; return { error: "Highlight not found" }; }
      if (existing.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      await db
        .delete(storyHighlightItems)
        .where(
          and(
            eq(storyHighlightItems.highlightId, params.id),
            eq(storyHighlightItems.storyId, params.storyId),
          )
        );

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), storyId: t.String() }),
    }
  )

  // Upload highlight cover image
  .post(
    "/:id/cover",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [existing] = await db
        .select({ id: storyHighlights.id, userId: storyHighlights.userId, coverImageUrl: storyHighlights.coverImageUrl })
        .from(storyHighlights)
        .where(eq(storyHighlights.id, params.id))
        .limit(1);

      if (!existing) { set.status = 404; return { error: "Highlight not found" }; }
      if (existing.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      const file = body.image;
      if (!file) { set.status = 400; return { error: "No image provided" }; }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        set.status = 400;
        return { error: "Invalid file type. Accepted: JPG, PNG, WEBP" };
      }

      if (file.size > 5 * 1024 * 1024) {
        set.status = 400;
        return { error: "File too large. Maximum 5MB" };
      }

      // Delete old cover if exists
      if (existing.coverImageUrl) {
        await storageService.delete(existing.coverImageUrl).catch(() => {});
      }

      const buffer = await file.arrayBuffer();
      const folder = `highlights/${user.id}/${params.id}`;
      const { path } = await storageService.uploadStoryImage(buffer, folder);

      const [updated] = await db
        .update(storyHighlights)
        .set({ coverImageUrl: path })
        .where(eq(storyHighlights.id, params.id))
        .returning();

      return {
        data: updated,
        coverImageUrl: storageService.getImageUrl(path),
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        image: t.File({ maxSize: "5m" }),
      }),
    }
  );
