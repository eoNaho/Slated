import { Elysia, t } from "elysia";
import { db, eq, and, desc, lte } from "../db";
import { termsVersions, consentRecords } from "../db/schema/consent";
import { betterAuthPlugin } from "../lib/auth";

export const consentRoutes = new Elysia({ prefix: "/consent", tags: ["Consent"] })
  .use(betterAuthPlugin)

  // GET /consent/current-versions
  // Returns the currently active terms and privacy versions.
  // Public — called by the sign-up form before user is authenticated.
  .get("/current-versions", async () => {
    const now = new Date();

    const [terms, privacy] = await Promise.all([
      db
        .select()
        .from(termsVersions)
        .where(
          and(
            eq(termsVersions.documentType, "terms"),
            lte(termsVersions.effectiveAt, now),
          ),
        )
        .orderBy(desc(termsVersions.effectiveAt))
        .limit(1),
      db
        .select()
        .from(termsVersions)
        .where(
          and(
            eq(termsVersions.documentType, "privacy"),
            lte(termsVersions.effectiveAt, now),
          ),
        )
        .orderBy(desc(termsVersions.effectiveAt))
        .limit(1),
    ]);

    return {
      terms: terms[0] ?? null,
      privacy: privacy[0] ?? null,
    };
  })

  // GET /consent/status
  // Returns whether the authenticated user has accepted the current terms.
  .get(
    "/status",
    async (ctx: any) => {
      const { user: authUser } = ctx;
      const now = new Date();

      const [currentTerms, currentPrivacy] = await Promise.all([
        db
          .select()
          .from(termsVersions)
          .where(
            and(
              eq(termsVersions.documentType, "terms"),
              lte(termsVersions.effectiveAt, now),
            ),
          )
          .orderBy(desc(termsVersions.effectiveAt))
          .limit(1),
        db
          .select()
          .from(termsVersions)
          .where(
            and(
              eq(termsVersions.documentType, "privacy"),
              lte(termsVersions.effectiveAt, now),
            ),
          )
          .orderBy(desc(termsVersions.effectiveAt))
          .limit(1),
      ]);

      if (!currentTerms[0] || !currentPrivacy[0]) {
        return { needsAcceptance: false };
      }

      const [termsConsent, privacyConsent] = await Promise.all([
        db
          .select()
          .from(consentRecords)
          .where(
            and(
              eq(consentRecords.userId, authUser.id),
              eq(consentRecords.termsVersionId, currentTerms[0].id),
            ),
          )
          .limit(1),
        db
          .select()
          .from(consentRecords)
          .where(
            and(
              eq(consentRecords.userId, authUser.id),
              eq(consentRecords.termsVersionId, currentPrivacy[0].id),
            ),
          )
          .limit(1),
      ]);

      return {
        needsAcceptance: !termsConsent[0] || !privacyConsent[0],
        currentVersions: {
          terms: { id: currentTerms[0].id, version: currentTerms[0].version },
          privacy: { id: currentPrivacy[0].id, version: currentPrivacy[0].version },
        },
        accepted: {
          terms: !!termsConsent[0],
          privacy: !!privacyConsent[0],
        },
      };
    },
    { requireAuth: true },
  )

  // POST /consent/accept
  // Records consent for the current terms and privacy versions.
  .post(
    "/accept",
    async (ctx: any) => {
      const { user: authUser, body, request } = ctx;

      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        null;
      const userAgent = request.headers.get("user-agent") ?? null;

      const inserts = [];

      if (body.termsVersionId) {
        inserts.push(
          db.insert(consentRecords).values({
            userId: authUser.id,
            termsVersionId: body.termsVersionId,
            ipAddress,
            userAgent,
            method: body.method ?? "signup",
          }),
        );
      }

      if (body.privacyVersionId) {
        inserts.push(
          db.insert(consentRecords).values({
            userId: authUser.id,
            termsVersionId: body.privacyVersionId,
            ipAddress,
            userAgent,
            method: body.method ?? "signup",
          }),
        );
      }

      if (inserts.length === 0) {
        return { error: "No version IDs provided" };
      }

      await Promise.all(inserts);

      return { success: true };
    },
    {
      requireAuth: true,
      body: t.Object({
        termsVersionId: t.Optional(t.String()),
        privacyVersionId: t.Optional(t.String()),
        method: t.Optional(
          t.Union([
            t.Literal("signup"),
            t.Literal("reaccept"),
            t.Literal("oauth_signup"),
          ]),
        ),
      }),
    },
  )

  // GET /consent/history
  // Returns the user's full consent history (LGPD data portability).
  .get(
    "/history",
    async (ctx: any) => {
      const { user: authUser } = ctx;

      const records = await db
        .select({
          id: consentRecords.id,
          acceptedAt: consentRecords.acceptedAt,
          method: consentRecords.method,
          ipAddress: consentRecords.ipAddress,
          documentType: termsVersions.documentType,
          version: termsVersions.version,
          effectiveAt: termsVersions.effectiveAt,
        })
        .from(consentRecords)
        .innerJoin(termsVersions, eq(consentRecords.termsVersionId, termsVersions.id))
        .where(eq(consentRecords.userId, authUser.id))
        .orderBy(desc(consentRecords.acceptedAt));

      return { history: records };
    },
    { requireAuth: true },
  );
