import { Elysia, t } from "elysia";
import { db, media as mediaTable, eq, and } from "../db";
import { mediaCustomCovers } from "../db/schema/identity";
import { betterAuthPlugin } from "../lib/auth";
import { storageService } from "../services/storage";
import { checkFeature } from "../lib/feature-gate";

export const mediaCoversRoutes = new Elysia({
  prefix: "/media",
  tags: ["Media"],
})
  .use(betterAuthPlugin)

  // Upload custom cover for a media item
  .post(
    "/:id/custom-cover",
    async (ctx: any) => {
      const { user, params, request, set } = ctx;

      const canUseCustomCovers = await checkFeature(user.id, "custom_media_cover");
      if (!canUseCustomCovers) {
        set.status = 403;
        return { error: "Custom media covers require a Pro or Ultra subscription" };
      }

      // Verify media exists
      const [targetMedia] = await db
        .select({ id: mediaTable.id })
        .from(mediaTable)
        .where(eq(mediaTable.id, params.id))
        .limit(1);

      if (!targetMedia) {
        set.status = 404;
        return { error: "Media not found" };
      }

      const formData = await request.formData();
      const file = formData.get("cover") as File | null;

      if (!file || typeof file === "string") {
        set.status = 400;
        return { error: "No image file provided" };
      }

      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        set.status = 400;
        return { error: "Only JPEG, PNG, WebP and GIF images are allowed" };
      }

      if (file.size > 10 * 1024 * 1024) {
        set.status = 400;
        return { error: "Image must be under 10 MB" };
      }

      // Delete old custom cover if it exists
      const [existing] = await db
        .select()
        .from(mediaCustomCovers)
        .where(
          and(
            eq(mediaCustomCovers.userId, user.id),
            eq(mediaCustomCovers.mediaId, params.id),
          ),
        )
        .limit(1);

      if (existing?.imagePath) {
        await storageService.delete(existing.imagePath).catch(() => null);
      }

      const buffer = await file.arrayBuffer();
      const isGif = file.type === "image/gif";
      const { path } = await storageService.uploadPoster(
        buffer,
        `users/${user.id}/covers/${params.id}`,
        { animated: isGif },
      );

      const [cover] = await db
        .insert(mediaCustomCovers)
        .values({
          userId: user.id,
          mediaId: params.id,
          imagePath: path,
        })
        .onConflictDoUpdate({
          target: [mediaCustomCovers.userId, mediaCustomCovers.mediaId],
          set: { imagePath: path, createdAt: new Date() },
        })
        .returning();

      return {
        data: {
          ...cover,
          imageUrl: storageService.getImageUrl(cover.imagePath),
        },
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  )

  // Delete custom cover for a media item
  .delete(
    "/:id/custom-cover",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [existing] = await db
        .select()
        .from(mediaCustomCovers)
        .where(
          and(
            eq(mediaCustomCovers.userId, user.id),
            eq(mediaCustomCovers.mediaId, params.id),
          ),
        )
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Custom cover not found" };
      }

      await storageService.delete(existing.imagePath).catch(() => null);
      await db
        .delete(mediaCustomCovers)
        .where(
          and(
            eq(mediaCustomCovers.userId, user.id),
            eq(mediaCustomCovers.mediaId, params.id),
          ),
        );

      return { data: { deleted: true } };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  )
