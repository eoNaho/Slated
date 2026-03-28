import { Elysia } from "elysia";
import { auth, type User } from "../auth";

type Role = "user" | "moderator" | "admin";

/**
 * Resolves the current session and injects `user` and `session` into context.
 * Returns 401 if not authenticated.
 */
export function withSession() {
  // No fixed name — prevents Elysia from deduplicating this plugin across route
  // files. Each route that calls withSession() gets its own resolver instance.
  return new Elysia().resolve(
    { as: "scoped" },
    async ({ request: { headers }, status }) => {
      const session = await auth.api.getSession({ headers });
      if (!session) return status(401);
      return {
        user: session.user as User,
        session: session.session,
      };
    }
  );
}

/**
 * Requires the user to have one of the given roles.
 * Must be used after withSession().
 */
function requireRole(...roles: Role[]) {
  return new Elysia().onBeforeHandle(
    { as: "scoped" },
    ({ user, status }: any) => {
      if (!user) return status(401);
      if (!roles.includes(user.role as Role)) return status(403);
    }
  );
}

/** Admin-only guard: resolves session + requires role === "admin" */
export function adminGuard() {
  return new Elysia()
    .use(withSession())
    .use(requireRole("admin"));
}

/** Staff guard: resolves session + requires role === "admin" OR "moderator" */
export function staffGuard() {
  return new Elysia()
    .use(withSession())
    .use(requireRole("admin", "moderator"));
}
