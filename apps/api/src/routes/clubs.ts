import { Elysia, t } from "elysia";
import {
  db,
  user as userTable,
  clubs,
  clubMembers,
  clubInvites,
  clubJoinRequests,
  activities,
  subscriptions,
  plans,
  reviews,
  eq,
  and,
  desc,
  asc,
  count,
  inArray,
  ilike,
  or,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { storageService } from "../services/storage";
import { PLAN_LIMITS, planTierFromSubscription } from "../config/plans";
import { CLUB_CATEGORIES } from "../db/schema/clubs";
import { createNotification } from "./notifications";

function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

async function getUserPlanLimits(userId: string) {
  const [row] = await db
    .select({ planSlug: plans.slug })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);
  const tier = planTierFromSubscription(row?.planSlug);
  return { tier, limits: PLAN_LIMITS[tier] };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

async function getMembership(clubId: string, userId: string) {
  const [membership] = await db
    .select({ role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)))
    .limit(1);
  return membership ?? null;
}

export const clubsRoutes = new Elysia({ prefix: "/clubs", tags: ["Clubs"] })
  .use(betterAuthPlugin)

  // ==========================================================================
  // List public clubs
  // ==========================================================================

  .get(
    "/",
    async ({ query }: any) => {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const category = query.category;
      const search = query.search;

      const conditions: any[] = [eq(clubs.isPublic, true)];

      if (category) {
        conditions.push(
          // @ts-ignore
          (db as any).sql`${clubs.categories} @> ARRAY[${category}]::text[]`
        );
      }

      if (search) {
        conditions.push(
          or(ilike(clubs.name, `%${search}%`), ilike(clubs.description, `%${search}%`))
        );
      }

      const results = await db
        .select({
          club: clubs,
          owner: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubs)
        .innerJoin(userTable, eq(clubs.ownerId, userTable.id))
        .where(and(...conditions))
        .orderBy(desc(clubs.memberCount))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(clubs)
        .where(and(...conditions));

      return {
        data: results.map((r) => ({
          ...r.club,
          coverUrl: resolveImageUrl(r.club.coverUrl),
          owner: r.owner,
        })),
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
        category: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================================================
  // Get my clubs (joined + owned)
  // ==========================================================================

  .get("/my", async (ctx: any) => {
    const { user } = ctx;

    const memberships = await db
      .select({
        club: clubs,
        role: clubMembers.role,
        joinedAt: clubMembers.joinedAt,
      })
      .from(clubMembers)
      .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
      .where(eq(clubMembers.userId, user.id))
      .orderBy(desc(clubMembers.joinedAt));

    return {
      data: memberships.map((m) => ({
        ...m.club,
        coverUrl: resolveImageUrl(m.club.coverUrl),
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }, { requireAuth: true })

  // ==========================================================================
  // Get my pending invites
  // ==========================================================================

  .get("/invites", async (ctx: any) => {
    const { user } = ctx;

    const pending = await db
      .select({
        invite: clubInvites,
        club: {
          id: clubs.id,
          name: clubs.name,
          slug: clubs.slug,
          coverUrl: clubs.coverUrl,
          memberCount: clubs.memberCount,
        },
        invitedBy: {
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
        },
      })
      .from(clubInvites)
      .innerJoin(clubs, eq(clubInvites.clubId, clubs.id))
      .innerJoin(userTable, eq(clubInvites.invitedBy, userTable.id))
      .where(
        and(
          eq(clubInvites.invitedUserId, user.id),
          eq(clubInvites.status, "pending")
        )
      );

    return { data: pending };
  }, { requireAuth: true })

  // ==========================================================================
  // Get available categories
  // ==========================================================================

  .get("/categories", () => ({ data: CLUB_CATEGORIES }))

  // ==========================================================================
  // Create club
  // ==========================================================================

  .post(
    "/",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      const { tier, limits } = await getUserPlanLimits(user.id);
      const [{ owned }] = await db
        .select({ owned: count() })
        .from(clubs)
        .where(eq(clubs.ownerId, user.id));

      if (owned >= limits.clubs.maxCreated) {
        set.status = 400;
        return {
          error: `Your ${tier} plan allows creating up to ${limits.clubs.maxCreated} clubs. Upgrade to create more.`,
        };
      }

      const invalidCategories = body.categories?.filter(
        (c: string) => !CLUB_CATEGORIES.includes(c as any)
      );
      if (invalidCategories?.length > 0) {
        set.status = 400;
        return { error: `Invalid categories: ${invalidCategories.join(", ")}` };
      }

      let slug = generateSlug(body.name);
      const existing = await db
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.slug, slug))
        .limit(1);
      if (existing.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

      const [newClub] = await db
        .insert(clubs)
        .values({
          name: body.name,
          slug,
          description: body.description,
          isPublic: body.isPublic ?? true,
          allowJoinRequests: body.allowJoinRequests ?? false,
          categories: body.categories ?? [],
          maxMembers: limits.clubs.maxMembers,
          memberCount: 1,
          ownerId: user.id,
        })
        .returning();

      await db.insert(clubMembers).values({
        clubId: newClub.id,
        userId: user.id,
        role: "owner",
      });

      // Create activity for discoverable clubs (public or accepting join requests)
      if (newClub.isPublic || newClub.allowJoinRequests) {
        await db.insert(activities).values({
          userId: user.id,
          type: "club",
          targetType: "club",
          targetId: newClub.id,
          metadata: JSON.stringify({
            name: newClub.name,
            slug: newClub.slug,
            description: newClub.description,
            coverUrl: newClub.coverUrl,
            categories: newClub.categories,
            memberCount: 1,
            isPublic: newClub.isPublic,
            allowJoinRequests: newClub.allowJoinRequests,
          }),
        });
      }

      return { data: newClub };
    },
    {
      requireAuth: true,
      body: t.Object({
        name: t.String({ minLength: 3, maxLength: 60 }),
        description: t.Optional(t.String({ maxLength: 500 })),
        isPublic: t.Optional(t.Boolean()),
        allowJoinRequests: t.Optional(t.Boolean()),
        categories: t.Optional(t.Array(t.String(), { maxItems: 3 })),
      }),
    }
  )

  // ==========================================================================
  // Get club by ID or slug
  // ==========================================================================

  .get(
    "/:id",
    async (ctx: any) => {
      const { params, request, set } = ctx;

      const session = await getOptionalSession(request.headers);
      const sessionUserId = session?.session?.userId ?? session?.user?.id ?? null;

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = UUID_RE.test(params.id);

      const [club] = await db
        .select({
          club: clubs,
          owner: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubs)
        .innerJoin(userTable, eq(clubs.ownerId, userTable.id))
        .where(isUuid ? or(eq(clubs.id, params.id), eq(clubs.slug, params.id)) : eq(clubs.slug, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      if (!club.club.isPublic) {
        if (!sessionUserId) {
          set.status = 403;
          return { error: "This club is private" };
        }
        const [membership] = await db
          .select()
          .from(clubMembers)
          .where(and(eq(clubMembers.clubId, club.club.id), eq(clubMembers.userId, sessionUserId)))
          .limit(1);
        if (!membership) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      let myRole = null;
      if (sessionUserId) {
        const [membership] = await db
          .select({ role: clubMembers.role })
          .from(clubMembers)
          .where(and(eq(clubMembers.clubId, club.club.id), eq(clubMembers.userId, sessionUserId)))
          .limit(1);
        myRole = membership?.role ?? null;
      }

      return {
        data: {
          ...club.club,
          coverUrl: resolveImageUrl(club.club.coverUrl),
          owner: club.owner,
          myRole,
        },
      };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ==========================================================================
  // Update club (owner/moderator)
  // ==========================================================================

  .patch(
    "/:id",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const membership = await getMembership(params.id, user.id);
      if (!membership || membership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can update a club" };
      }

      const updates: any = { updatedAt: new Date() };
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
      if (body.allowJoinRequests !== undefined) updates.allowJoinRequests = body.allowJoinRequests;
      if (body.categories !== undefined) {
        const invalid = body.categories.filter(
          (c: string) => !CLUB_CATEGORIES.includes(c as any)
        );
        if (invalid.length > 0) {
          set.status = 400;
          return { error: `Invalid categories: ${invalid.join(", ")}` };
        }
        updates.categories = body.categories;
      }

      const [updated] = await db
        .update(clubs)
        .set(updates)
        .where(eq(clubs.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 3, maxLength: 60 })),
        description: t.Optional(t.String({ maxLength: 500 })),
        isPublic: t.Optional(t.Boolean()),
        allowJoinRequests: t.Optional(t.Boolean()),
        categories: t.Optional(t.Array(t.String(), { maxItems: 3 })),
      }),
    }
  )

  // ==========================================================================
  // Upload club cover/banner (owner/moderator)
  // ==========================================================================

  .post(
    "/:id/cover",
    async (ctx: any) => {
      const { user, params, request, set } = ctx;

      const membership = await getMembership(params.id, user.id);
      if (!membership || membership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can update the club cover" };
      }

      const [club] = await db
        .select({ id: clubs.id, coverUrl: clubs.coverUrl })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      const formData = await request.formData();
      const file = formData.get("cover") as File | null;

      if (!file || typeof file === "string") {
        set.status = 400;
        return { error: "No image file provided" };
      }

      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        set.status = 400;
        return { error: "Only JPEG, PNG and WebP images are allowed" };
      }

      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        set.status = 400;
        return { error: "Image must be under 5MB" };
      }

      const buffer = await file.arrayBuffer();
      const { path } = await storageService.uploadBackdrop(buffer, `clubs/${params.id}`);

      // Delete old cover if it was a custom upload (not tmdb)
      if (club.coverUrl && !club.coverUrl.startsWith("tmdb:")) {
        await storageService.delete(club.coverUrl).catch(() => null);
      }

      await db
        .update(clubs)
        .set({ coverUrl: path, updatedAt: new Date() })
        .where(eq(clubs.id, params.id));

      return { data: { coverUrl: storageService.getImageUrl(path) } };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ==========================================================================
  // Remove club cover/banner (owner/moderator)
  // ==========================================================================

  .delete(
    "/:id/cover",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const membership = await getMembership(params.id, user.id);
      if (!membership || membership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can update the club cover" };
      }

      const [club] = await db
        .select({ coverUrl: clubs.coverUrl })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      if (club.coverUrl && !club.coverUrl.startsWith("tmdb:")) {
        await storageService.delete(club.coverUrl).catch(() => null);
      }

      await db
        .update(clubs)
        .set({ coverUrl: null, updatedAt: new Date() })
        .where(eq(clubs.id, params.id));

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ==========================================================================
  // Delete club (owner only)
  // ==========================================================================

  .delete(
    "/:id",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [club] = await db
        .select({ ownerId: clubs.ownerId })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }
      if (club.ownerId !== user.id) {
        set.status = 403;
        return { error: "Only the owner can delete a club" };
      }

      await db.delete(clubs).where(eq(clubs.id, params.id));

      return { success: true, message: "Club deleted" };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ==========================================================================
  // Join a public club
  // ==========================================================================

  .post(
    "/:id/join",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [club] = await db
        .select()
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }
      if (!club.isPublic) {
        set.status = 403;
        return { error: "This club is private. You need an invitation to join." };
      }
      if (club.memberCount >= club.maxMembers) {
        set.status = 400;
        return { error: "This club has reached its member limit" };
      }

      try {
        await db.insert(clubMembers).values({ clubId: params.id, userId: user.id, role: "member" });
        await db.update(clubs).set({ memberCount: club.memberCount + 1 }).where(eq(clubs.id, params.id));
        return { success: true, message: "Joined club" };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already a member of this club" };
        }
        throw e;
      }
    },
    { requireAuth: true, params: t.Object({ id: t.String() }) }
  )

  // ==========================================================================
  // Leave club
  // ==========================================================================

  .delete(
    "/:id/leave",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [club] = await db
        .select({ ownerId: clubs.ownerId, memberCount: clubs.memberCount })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }
      if (club.ownerId === user.id) {
        set.status = 400;
        return { error: "Owner cannot leave. Transfer ownership or delete the club." };
      }

      await db
        .delete(clubMembers)
        .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, user.id)));
      await db
        .update(clubs)
        .set({ memberCount: Math.max(1, club.memberCount - 1) })
        .where(eq(clubs.id, params.id));

      return { success: true, message: "Left club" };
    },
    { requireAuth: true, params: t.Object({ id: t.String() }) }
  )

  // ==========================================================================
  // Get club members
  // ==========================================================================

  .get(
    "/:id/members",
    async (ctx: any) => {
      const { params, query, request, set } = ctx;

      const session = await getOptionalSession(request.headers);
      const sessionUserId = session?.session?.userId ?? session?.user?.id ?? null;

      const [club] = await db
        .select({ isPublic: clubs.isPublic })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      if (!club.isPublic) {
        if (!sessionUserId) {
          set.status = 403;
          return { error: "This club is private" };
        }
        const [membership] = await db
          .select()
          .from(clubMembers)
          .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, sessionUserId)))
          .limit(1);
        if (!membership) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(Number(query?.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const members = await db
        .select({
          member: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
            isVerified: userTable.isVerified,
          },
          role: clubMembers.role,
          joinedAt: clubMembers.joinedAt,
        })
        .from(clubMembers)
        .innerJoin(userTable, eq(clubMembers.userId, userTable.id))
        .where(eq(clubMembers.clubId, params.id))
        .orderBy(asc(clubMembers.joinedAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(clubMembers)
        .where(eq(clubMembers.clubId, params.id));

      return {
        data: members.map((m) => ({
          id: `${params.id}-${m.member.id}`,
          clubId: params.id,
          userId: m.member.id,
          role: m.role,
          joinedAt: m.joinedAt,
          user: {
            id: m.member.id,
            username: m.member.username,
            displayName: m.member.displayName,
            avatarUrl: m.member.avatarUrl,
          },
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================================================
  // Kick member (owner/moderator)
  // ==========================================================================

  .delete(
    "/:id/members/:userId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [club] = await db
        .select({ ownerId: clubs.ownerId, memberCount: clubs.memberCount })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      const myMembership = await getMembership(params.id, user.id);
      if (!myMembership || myMembership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can kick members" };
      }

      if (params.userId === user.id) {
        set.status = 400;
        return { error: "Cannot kick yourself" };
      }

      const targetMembership = await getMembership(params.id, params.userId);
      if (!targetMembership) {
        set.status = 404;
        return { error: "User is not a member of this club" };
      }

      // Moderators cannot kick other moderators or the owner
      if (myMembership.role === "moderator" && targetMembership.role !== "member") {
        set.status = 403;
        return { error: "Moderators can only kick regular members" };
      }

      if (targetMembership.role === "owner") {
        set.status = 403;
        return { error: "Cannot kick the owner" };
      }

      await db
        .delete(clubMembers)
        .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, params.userId)));
      await db
        .update(clubs)
        .set({ memberCount: Math.max(1, club.memberCount - 1) })
        .where(eq(clubs.id, params.id));

      return { success: true, message: "Member removed" };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), userId: t.String() }),
    }
  )

  // ==========================================================================
  // Promote / demote member (owner only)
  // ==========================================================================

  .patch(
    "/:id/members/:userId",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [club] = await db
        .select({ ownerId: clubs.ownerId })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }
      if (club.ownerId !== user.id) {
        set.status = 403;
        return { error: "Only the owner can change member roles" };
      }
      if (params.userId === user.id) {
        set.status = 400;
        return { error: "Cannot change your own role" };
      }
      if (body.role === "owner") {
        set.status = 400;
        return { error: "Use the transfer ownership endpoint instead" };
      }

      const targetMembership = await getMembership(params.id, params.userId);
      if (!targetMembership) {
        set.status = 404;
        return { error: "User is not a member of this club" };
      }

      const [updated] = await db
        .update(clubMembers)
        .set({ role: body.role })
        .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, params.userId)))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), userId: t.String() }),
      body: t.Object({
        role: t.Union([t.Literal("moderator"), t.Literal("member")]),
      }),
    }
  )

  // ==========================================================================
  // Transfer ownership (owner only)
  // ==========================================================================

  .post(
    "/:id/transfer",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [club] = await db
        .select({ ownerId: clubs.ownerId })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }
      if (club.ownerId !== user.id) {
        set.status = 403;
        return { error: "Only the current owner can transfer ownership" };
      }

      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.username, body.username))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }
      if (targetUser.id === user.id) {
        set.status = 400;
        return { error: "Already the owner" };
      }

      const targetMembership = await getMembership(params.id, targetUser.id);
      if (!targetMembership) {
        set.status = 400;
        return { error: "User must be a member of the club first" };
      }

      // Swap roles
      await db
        .update(clubMembers)
        .set({ role: "member" })
        .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, user.id)));
      await db
        .update(clubMembers)
        .set({ role: "owner" })
        .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, targetUser.id)));
      await db
        .update(clubs)
        .set({ ownerId: targetUser.id, updatedAt: new Date() })
        .where(eq(clubs.id, params.id));

      return { success: true, message: "Ownership transferred" };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({ username: t.String() }),
    }
  )

  // ==========================================================================
  // Request to join (private clubs with allowJoinRequests=true)
  // ==========================================================================

  .post(
    "/:id/request",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [club] = await db
        .select({ isPublic: clubs.isPublic, allowJoinRequests: clubs.allowJoinRequests, memberCount: clubs.memberCount, maxMembers: clubs.maxMembers })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }
      if (club.isPublic) {
        set.status = 400;
        return { error: "This club is public. Use the join endpoint instead." };
      }
      if (!club.allowJoinRequests) {
        set.status = 403;
        return { error: "This club does not accept join requests" };
      }
      if (club.memberCount >= club.maxMembers) {
        set.status = 400;
        return { error: "This club has reached its member limit" };
      }

      const existingMembership = await getMembership(params.id, user.id);
      if (existingMembership) {
        set.status = 400;
        return { error: "Already a member of this club" };
      }

      try {
        const [request] = await db
          .insert(clubJoinRequests)
          .values({
            clubId: params.id,
            userId: user.id,
            message: body.message,
          })
          .returning();

        return { data: request };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Join request already sent" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        message: t.Optional(t.String({ maxLength: 300 })),
      }),
    }
  )

  // ==========================================================================
  // List join requests (owner/moderator)
  // ==========================================================================

  .get(
    "/:id/requests",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const myMembership = await getMembership(params.id, user.id);
      if (!myMembership || myMembership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can view join requests" };
      }

      const requests = await db
        .select({
          request: clubJoinRequests,
          requester: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubJoinRequests)
        .innerJoin(userTable, eq(clubJoinRequests.userId, userTable.id))
        .where(and(eq(clubJoinRequests.clubId, params.id), eq(clubJoinRequests.status, "pending")))
        .orderBy(desc(clubJoinRequests.createdAt));

      return { data: requests };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ==========================================================================
  // Accept join request
  // ==========================================================================

  .post(
    "/:id/requests/:requestId/accept",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const myMembership = await getMembership(params.id, user.id);
      if (!myMembership || myMembership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can accept join requests" };
      }

      const [request] = await db
        .select()
        .from(clubJoinRequests)
        .where(and(eq(clubJoinRequests.id, params.requestId), eq(clubJoinRequests.clubId, params.id)))
        .limit(1);

      if (!request) {
        set.status = 404;
        return { error: "Request not found" };
      }
      if (request.status !== "pending") {
        set.status = 400;
        return { error: `Request is already ${request.status}` };
      }

      const [club] = await db
        .select({ memberCount: clubs.memberCount, maxMembers: clubs.maxMembers })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club || club.memberCount >= club.maxMembers) {
        set.status = 400;
        return { error: "Club has reached its member limit" };
      }

      await db.insert(clubMembers).values({ clubId: params.id, userId: request.userId, role: "member" });
      await db.update(clubs).set({ memberCount: club.memberCount + 1 }).where(eq(clubs.id, params.id));
      await db
        .update(clubJoinRequests)
        .set({ status: "accepted", respondedBy: user.id, respondedAt: new Date() })
        .where(eq(clubJoinRequests.id, params.requestId));

      return { success: true, message: "Request accepted" };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), requestId: t.String() }),
    }
  )

  // ==========================================================================
  // Reject join request
  // ==========================================================================

  .post(
    "/:id/requests/:requestId/reject",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const myMembership = await getMembership(params.id, user.id);
      if (!myMembership || myMembership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can reject join requests" };
      }

      const [request] = await db
        .select()
        .from(clubJoinRequests)
        .where(and(eq(clubJoinRequests.id, params.requestId), eq(clubJoinRequests.clubId, params.id)))
        .limit(1);

      if (!request || request.status !== "pending") {
        set.status = 404;
        return { error: "Request not found or already responded" };
      }

      await db
        .update(clubJoinRequests)
        .set({ status: "rejected", respondedBy: user.id, respondedAt: new Date() })
        .where(eq(clubJoinRequests.id, params.requestId));

      return { success: true, message: "Request rejected" };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), requestId: t.String() }),
    }
  )

  // ==========================================================================
  // Invite user to club (owner/moderator)
  // ==========================================================================

  .post(
    "/:id/invite",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [club] = await db
        .select({ name: clubs.name, memberCount: clubs.memberCount, maxMembers: clubs.maxMembers })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      const membership = await getMembership(params.id, user.id);
      if (!membership || membership.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can invite members" };
      }
      if (club.memberCount >= club.maxMembers) {
        set.status = 400;
        return { error: "Club has reached its member limit" };
      }

      const [invitedUser] = await db
        .select({ id: userTable.id, username: userTable.username })
        .from(userTable)
        .where(eq(userTable.username, body.username))
        .limit(1);

      if (!invitedUser) {
        set.status = 404;
        return { error: "User not found" };
      }
      if (invitedUser.id === user.id) {
        set.status = 400;
        return { error: "Cannot invite yourself" };
      }

      const alreadyMember = await getMembership(params.id, invitedUser.id);
      if (alreadyMember) {
        set.status = 400;
        return { error: "User is already a member" };
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [invite] = await db
        .insert(clubInvites)
        .values({ clubId: params.id, invitedBy: user.id, invitedUserId: invitedUser.id, expiresAt })
        .onConflictDoUpdate({
          target: [clubInvites.clubId, clubInvites.invitedUserId],
          set: { invitedBy: user.id, status: "pending", expiresAt },
        })
        .returning();

      // Notify invited user (fire-and-forget)
      createNotification(
        invitedUser.id,
        "club_invite",
        `Convite para o club "${club.name}"`,
        `@${user.username} te convidou para entrar no club "${club.name}".`,
        { clubId: params.id, inviteId: invite.id, invitedBy: user.username },
        user.id,
      );

      return { data: invite };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({ username: t.String() }),
    }
  )

  // ==========================================================================
  // Accept invite
  // ==========================================================================

  .post(
    "/invites/:inviteId/accept",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [invite] = await db
        .select()
        .from(clubInvites)
        .where(and(eq(clubInvites.id, params.inviteId), eq(clubInvites.invitedUserId, user.id)))
        .limit(1);

      if (!invite) {
        set.status = 404;
        return { error: "Invite not found" };
      }
      if (invite.status !== "pending") {
        set.status = 400;
        return { error: `Invite is already ${invite.status}` };
      }
      if (new Date() > invite.expiresAt) {
        await db.update(clubInvites).set({ status: "expired" }).where(eq(clubInvites.id, params.inviteId));
        set.status = 400;
        return { error: "Invite has expired" };
      }

      const [club] = await db
        .select({ memberCount: clubs.memberCount, maxMembers: clubs.maxMembers })
        .from(clubs)
        .where(eq(clubs.id, invite.clubId))
        .limit(1);

      if (!club || club.memberCount >= club.maxMembers) {
        set.status = 400;
        return { error: "Club has reached its member limit" };
      }

      await db.insert(clubMembers).values({ clubId: invite.clubId, userId: user.id, role: "member" });
      await db.update(clubs).set({ memberCount: club.memberCount + 1 }).where(eq(clubs.id, invite.clubId));
      await db.update(clubInvites).set({ status: "accepted" }).where(eq(clubInvites.id, params.inviteId));

      return { success: true, message: "Joined club" };
    },
    { requireAuth: true, params: t.Object({ inviteId: t.String() }) }
  )

  // ==========================================================================
  // Decline invite
  // ==========================================================================

  .post(
    "/invites/:inviteId/decline",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [invite] = await db
        .select()
        .from(clubInvites)
        .where(and(eq(clubInvites.id, params.inviteId), eq(clubInvites.invitedUserId, user.id)))
        .limit(1);

      if (!invite || invite.status !== "pending") {
        set.status = 404;
        return { error: "Invite not found or already responded" };
      }

      await db.update(clubInvites).set({ status: "declined" }).where(eq(clubInvites.id, params.inviteId));
      return { success: true, message: "Invite declined" };
    },
    { requireAuth: true, params: t.Object({ inviteId: t.String() }) }
  )

  // ==========================================================================
  // Club activity feed (what members have been watching/reviewing)
  // ==========================================================================

  .get(
    "/:id/feed",
    async (ctx: any) => {
      const { params, query, request, set } = ctx;

      const session = await getOptionalSession(request.headers);
      const sessionUserId = session?.session?.userId ?? session?.user?.id ?? null;

      const [club] = await db
        .select({ isPublic: clubs.isPublic })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      if (!club.isPublic) {
        if (!sessionUserId) {
          set.status = 403;
          return { error: "This club is private" };
        }
        const [membership] = await db
          .select()
          .from(clubMembers)
          .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, sessionUserId)))
          .limit(1);
        if (!membership) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(Number(query?.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const memberRows = await db
        .select({ userId: clubMembers.userId })
        .from(clubMembers)
        .where(eq(clubMembers.clubId, params.id));

      const memberIds = memberRows.map((r) => r.userId);
      if (memberIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      const feed = await db
        .select({
          activity: activities,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .where(inArray(activities.userId, memberIds))
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(activities)
        .where(inArray(activities.userId, memberIds));

      return {
        data: feed.map((f) => ({ ...f.activity, user: f.user })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================================================
  // Club stats
  // ==========================================================================

  .get(
    "/:id/stats",
    async (ctx: any) => {
      const { params, request, set } = ctx;

      const session = await getOptionalSession(request.headers);
      const sessionUserId = session?.session?.userId ?? session?.user?.id ?? null;

      const [club] = await db
        .select({ isPublic: clubs.isPublic, memberCount: clubs.memberCount })
        .from(clubs)
        .where(eq(clubs.id, params.id))
        .limit(1);

      if (!club) {
        set.status = 404;
        return { error: "Club not found" };
      }

      if (!club.isPublic) {
        if (!sessionUserId) {
          set.status = 403;
          return { error: "This club is private" };
        }
        const [membership] = await db
          .select()
          .from(clubMembers)
          .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, sessionUserId)))
          .limit(1);
        if (!membership) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const memberRows = await db
        .select({ userId: clubMembers.userId })
        .from(clubMembers)
        .where(eq(clubMembers.clubId, params.id));

      const memberIds = memberRows.map((r) => r.userId);

      if (memberIds.length === 0) {
        return {
          data: {
            memberCount: club.memberCount,
            totalActivities: 0,
            totalReviews: 0,
            mostActiveMembers: [],
          },
        };
      }

      const [{ totalActivities }] = await db
        .select({ totalActivities: count() })
        .from(activities)
        .where(inArray(activities.userId, memberIds));

      const [{ totalReviews }] = await db
        .select({ totalReviews: count() })
        .from(reviews)
        .where(inArray(reviews.userId, memberIds));

      // Top 5 most active members by activity count
      const activityCounts = await db
        .select({
          userId: activities.userId,
          activityCount: count(),
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .where(inArray(activities.userId, memberIds))
        .groupBy(activities.userId, userTable.id, userTable.username, userTable.displayName, userTable.avatarUrl)
        .orderBy(desc(count()))
        .limit(5);

      return {
        data: {
          memberCount: club.memberCount,
          totalActivities,
          totalReviews,
          mostActiveMembers: activityCounts.map((a) => ({
            user: a.user,
            activityCount: a.activityCount,
          })),
        },
      };
    },
    { params: t.Object({ id: t.String() }) }
  );
