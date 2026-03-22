import { Elysia, t } from "elysia";
import {
  db,
  user,
  reports,
  media,
  reviews,
  lists,
  planFeatureFlags,
  clubs,
  eq,
  desc,
  count,
  ilike,
  or,
  sql,
} from "../db";
import { auth, type User } from "../auth";
import { invalidateFlagsCache } from "../lib/feature-gate";

export const adminRoutes = new Elysia({ prefix: "/admin", tags: ["Admin"] })
  .resolve(async ({ request: { headers } }) => {
    const session = await auth.api.getSession({ headers });
    return {
      user: (session?.user ?? null) as User | null,
      session: session?.session ?? null,
    };
  })
  .onBeforeHandle(({ user: authUser, set }: any) => {
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
  .get(
    "/stats",
    async () => {
      const [{ totalUsers }] = await db
        .select({ totalUsers: count() })
        .from(user);
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
    },
  )

  // Manage Users
  .get(
    "/user",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const q = query.q || "";

      // Simple search implementation
      let baseQuery = db.select().from(user).limit(limit).offset(offset);

      const results = await baseQuery;

      const [{ total }] = await db.select({ total: count() }).from(user);

      return { data: results, total, page, limit };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        q: t.Optional(t.String()),
      }),
    },
  )

  // Ban/Unban User
  .patch(
    "/user/:id/status",
    async ({ params, body, set }: any) => {
      const { status } = body;

      const [updated] = await db
        .update(user)
        .set({ status })
        .where(eq(user.id, params.id))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "User not found" };
      }

      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([
          t.Literal("active"),
          t.Literal("suspended"),
          t.Literal("banned"),
        ]),
      }),
    },
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
      query: t.Object({ status: t.Optional(t.String()) }),
    },
  )

  // ─── All Clubs (admin view, includes private) ─────────────────────
  .get(
    "/clubs",
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 30, 100);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (query.search) {
        conditions.push(
          or(ilike(clubs.name, `%${query.search}%`), ilike(clubs.description, `%${query.search}%`))
        );
      }

      const rows = await db
        .select()
        .from(clubs)
        .where(conditions.length ? conditions[0] : undefined)
        .orderBy(desc(clubs.memberCount))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db.select({ total: count() }).from(clubs);

      return { data: rows, total, page, limit };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    },
  )

  // ─── Feature Flags ────────────────────────────────────────────────
  .get(
    "/feature-flags",
    async () => {
      const flags = await db.select().from(planFeatureFlags);
      return { data: flags };
    },
    { requireAuth: true }
  )

  .patch(
    "/feature-flags",
    async ({ body }: any) => {
      const { featureKey, plan, enabled } = body;

      const [updated] = await db
        .insert(planFeatureFlags)
        .values({ featureKey, plan, enabled })
        .onConflictDoUpdate({
          target: [planFeatureFlags.featureKey, planFeatureFlags.plan],
          set: { enabled, updatedAt: new Date() },
        })
        .returning();

      await invalidateFlagsCache();

      return { data: updated };
    },
    {
      body: t.Object({
        featureKey: t.String(),
        plan: t.Union([t.Literal("free"), t.Literal("pro"), t.Literal("ultra")]),
        enabled: t.Boolean(),
      }),
    }
  )

  // ─── Reports ──────────────────────────────────────────────────────
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
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal("resolved"), t.Literal("dismissed")]),
      }),
    },
  );
