import { Elysia, t } from "elysia";
import {
  db,
  user,
  reports,
  media,
  reviews,
  lists,
  eq,
  desc,
  count,
  sql,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const adminRoutes = new Elysia({ prefix: "/admin", tags: ["Admin"] })
  .use(betterAuthPlugin)
  .onBeforeHandle((ctx: any) => {
    const { user: authUser, set } = ctx;

    if (!authUser) {
      set.status = 401;
      return { error: "Unauthorized", message: "Authentication required" };
    }

    if (authUser.role !== "admin") {
      set.status = 403;
      return { error: "Forbidden", message: "Admin access required" };
    }
  })

  // System Stats
  .get("/stats", async () => {
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(userTable);
    const [{ totalMedia }] = await db
      .select({ totalMedia: count() })
      .from(media);
    const [{ totalReviews }] = await db
      .select({ totalReviews: count() })
      .from(reviews);
    const [{ totalLists }] = await db
      .select({ totalLists: count() })
      .from(lists);
    const [{ pendingReports }] = await db
      .select({ pendingReports: count() })
      .from(reports)
      .where(eq(reports.status, "pending"));

    return {
      data: {
        user: totalUsers,
        media: totalMedia,
        reviews: totalReviews,
        lists: totalLists,
        reports: pendingReports,
      },
    };
  }, { requireAuth: true })

  // Manage Users
  .get(
    "/user",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const q = query.q || "";

      // Simple search implementation
      let baseQuery = db.select().from(userTable).limit(limit).offset(offset);

      const results = await baseQuery;

      const [{ total }] = await db.select({ total: count() }).from(userTable);

      return { data: results, total, page, limit };
    },
    {
      requireAuth: true,
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        q: t.Optional(t.String()),
      }),
    }
  )

  // Ban/Unban User
  .patch(
    "/user/:id/status",
    async ({ params, body, set }: any) => {
      const { status } = body;

      const [updated] = await db
        .update(user)
        .set({ status })
        .where(eq(userTable.id, params.id))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "User not found" };
      }

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([
          t.Literal("active"),
          t.Literal("suspended"),
          t.Literal("banned"),
        ]),
      }),
    }
  )

  // Reports Management
  .get(
    "/reports",
    async ({ query }: any) => {
      const status = query.status || "pending";

      const results = await db
        .select()
        .from(reports)
        .where(eq(reports.status, status))
        .orderBy(desc(reports.createdAt));

      return { data: results };
    },
    {
      requireAuth: true,
      query: t.Object({ status: t.Optional(t.String()) }),
    }
  )

  .patch(
    "/reports/:id/resolve",
    async (ctx: any) => {
      const { user: authUser, params, body, set } = ctx;

      const [updated] = await db
        .update(reports)
        .set({
          status: body.status,
          resolvedBy: authUser.id,
          resolvedAt: new Date(),
        })
        .where(eq(reports.id, params.id))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "Report not found" };
      }

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal("resolved"), t.Literal("dismissed")]),
      }),
    }
  );
