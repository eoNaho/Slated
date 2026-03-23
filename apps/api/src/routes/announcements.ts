/**
 * Public Announcements Route
 * Returns the currently active announcement for the requesting user.
 */

import { Elysia } from "elysia";
import { db, platformAnnouncements, eq, and, or, isNull, lte, gt } from "../db";

export const announcementsRoutes = new Elysia({ prefix: "/announcements" })
  .get("/active", async ({ request }: any) => {
    const now = new Date();

    const rows = await db
      .select()
      .from(platformAnnouncements)
      .where(
        and(
          eq(platformAnnouncements.isActive, true),
          lte(platformAnnouncements.startAt, now),
          or(
            isNull(platformAnnouncements.endAt),
            gt(platformAnnouncements.endAt, now)
          )
        )
      )
      .orderBy(platformAnnouncements.createdAt)
      .limit(1);

    const announcement = rows[0] ?? null;
    return { data: announcement };
  });
