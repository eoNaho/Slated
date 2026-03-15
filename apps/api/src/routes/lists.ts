import { Elysia, t } from "elysia";
import {
  db,
  lists,
  listItems,
  media,
  user as userTable,
  likes,
  activities,
  eq,
  and,
  desc,
  count,
  sql,
  ilike,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const listsRoutes = new Elysia({ prefix: "/lists", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get recent public lists
  .get(
    "/",
    async ({ query }) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const conditions = [eq(lists.isPublic, true)];
      if (query.user_id) conditions.push(eq(lists.userId, query.user_id));
      const whereClause = and(...conditions);

      const results = await db
        .select({
          list: lists,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(lists)
        .innerJoin(userTable, eq(lists.userId, userTable.id))
        .where(whereClause)
        .orderBy(desc(lists.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(lists)
        .where(whereClause);

      return {
        data: results.map((r) => ({ ...r.list, user: r.user })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        user_id: t.Optional(t.String()),
      }),
    },
  )

  // Get single list details
  .get(
    "/:id",
    async ({ params, set }) => {
      const [result] = await db
        .select({
          list: lists,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(lists)
        .innerJoin(userTable, eq(lists.userId, userTable.id))
        .where(eq(lists.id, params.id))
        .limit(1);

      if (!result) {
        set.status = 404;
        return { error: "List not found" };
      }

      // Get items
      const items = await db
        .select({
          item: listItems,
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
          },
        })
        .from(listItems)
        .innerJoin(media, eq(listItems.mediaId, media.id))
        .where(eq(listItems.listId, params.id))
        .orderBy(listItems.position);

      return {
        data: {
          ...result.list,
          user: result.user,
          items: items.map((i) => ({ ...i.item, media: i.media })),
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // Create list
  .post(
    "/",
    async (ctx: any) => {
      const { user, body } = ctx;

      const [newList] = await db
        .insert(lists)
        .values({
          userId: user.id,
          name: body.name,
          description: body.description,
          isPublic: body.is_public ?? true,
          isRanked: body.is_ranked ?? false,
        })
        .returning();

      // Create activity
      await db.insert(activities).values({
        userId: user.id,
        type: "list",
        targetType: "list",
        targetId: newList.id,
        metadata: JSON.stringify({ name: body.name }),
      });

      return { data: newList };
    },
    {
      requireAuth: true,
      body: t.Object({
        name: t.String({ minLength: 3 }),
        description: t.Optional(t.String()),
        is_public: t.Optional(t.Boolean()),
        is_ranked: t.Optional(t.Boolean()),
      }),
    },
  )

  // Add item to list
  .post(
    "/:id/items",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      // Check ownership
      const [list] = await db
        .select()
        .from(lists)
        .where(eq(lists.id, params.id))
        .limit(1);

      if (!list) {
        set.status = 404;
        return { error: "List not found" };
      }

      if (list.userId !== user.id) {
        set.status = 403;
        return { error: "You can only edit your own lists" };
      }

      // Add item
      try {
        // Get current max position
        const [{ maxPos }] = await db
          .select({
            maxPos: sql<number>`COALESCE(MAX(${listItems.position}), 0)`,
          })
          .from(listItems)
          .where(eq(listItems.listId, params.id));

        const [newItem] = await db
          .insert(listItems)
          .values({
            listId: params.id,
            mediaId: body.media_id,
            position: maxPos + 1,
            note: body.note,
          })
          .returning();

        // Update list items count
        await db
          .update(lists)
          .set({ itemsCount: sql`${lists.itemsCount} + 1` })
          .where(eq(lists.id, params.id));

        return { data: newItem };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Item already in list" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        media_id: t.String(),
        note: t.Optional(t.String()),
      }),
    },
  );
