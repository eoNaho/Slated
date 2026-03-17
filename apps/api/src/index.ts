import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";

// Better Auth
import { auth } from "./auth";

// Security middleware
import {
  securityHeaders,
  requestLogger,
  rateLimit,
} from "./middleware/security";
import { logger } from "./utils/logger";

// Routes
import { usersRoutes } from "./routes/users";
import { mediaRoutes } from "./routes/media";
import { reviewsRoutes } from "./routes/reviews";
import { listsRoutes } from "./routes/lists";
import { watchlistRoutes } from "./routes/watchlist";
import { diaryRoutes } from "./routes/diary";
import { gamificationRoutes } from "./routes/gamification";
import { adminRoutes } from "./routes/admin";
import { plansRoutes } from "./routes/plans";
import { privacyRoutes } from "./routes/privacy";
import { clubsRoutes } from "./routes/clubs";
import { clubContentRoutes } from "./routes/club-content";
import { commentsRoutes } from "./routes/comments";
import { feedRoutes } from "./routes/feed";
import { searchRoutes } from "./routes/search";
import { notificationsRoutes } from "./routes/notifications";
import { stripeRoutes } from "./routes/stripeWebhook";
import { imageRoutes } from "./routes/images";

// Explicit list of allowed origins (never use `true` which allows all origins)
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || "https://pixelreel.com",
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:5173"]
    : []),
];

const app = new Elysia()
  // Security middleware (applied to all routes)
  .use(securityHeaders())
  .use(requestLogger())
  .use(rateLimit("default"))

  // CORS — explicit origin list in all environments
  .use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 86400,
    }),
  )

  // Better Auth handler — mounts all /api/auth/* routes automatically
  .mount(auth.handler)

  // OpenAPI docs with Scalar UI
  .use(
    openapi({
      provider: "scalar",
      path: "/docs",
      documentation: {
        info: {
          title: "PixelReel API",
          version: "1.0.0",
          description: "Complete API for PixelReel - Media, Social, Gamification",
        },
        tags: [
          { name: "Auth", description: "Authentication and OAuth" },
          { name: "Users", description: "User management" },
          { name: "Media", description: "Movies and Series" },
          { name: "Social", description: "Reviews, Comments, Feed" },
          { name: "Gamification", description: "Achievements and XP" },
          { name: "Admin", description: "System management" },
          { name: "Payments", description: "Stripe and Plans" },
        ],
        components: {
          securitySchemes: {
            cookieAuth: {
              type: "apiKey",
              in: "cookie",
              name: "better-auth.session_token",
            },
          },
        },
      },
    }),
  )

  // Global error handler
  .onError(({ error, code, set }: any) => {
    const errorMessage =
      "message" in error ? String(error.message) : "Unknown error";
    const cause = error?.cause ? String((error.cause as any)?.message ?? error.cause) : undefined;
    logger.error({ code, error: errorMessage, cause, stack: error?.stack?.split("\n")[1]?.trim() }, "Request error");

    switch (code) {
      case "VALIDATION": {
        set.status = 400;
        const ve = error?.valueError;
        const field = ve?.path ? ve.path.replace(/^\//, "") : undefined;
        const detail = field
          ? `'${field}' — ${ve?.message ?? "invalid value"}`
          : (ve?.message ?? errorMessage);
        return { error: "Validation failed", detail };
      }
      case "NOT_FOUND":
        set.status = 404;
        return { error: "Resource not found" };
      default:
        set.status = 500;
        return { error: "Internal server error" };
    }
  })

  // Health check
  .get("/", () => ({
    message: "PixelReel API v1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  }))

  .get("/health", () => ({ status: "ok", uptime: process.uptime() }))

  // Mount routes
  .group("/api/v1", (app: any) =>
    app
      .use(usersRoutes)
      .use(mediaRoutes)
      .use(reviewsRoutes)
      .use(listsRoutes)
      .use(watchlistRoutes)
      .use(diaryRoutes)
      .use(gamificationRoutes)
      .use(adminRoutes)
      .use(plansRoutes)
      .use(privacyRoutes)
      .use(clubsRoutes)
      .use(clubContentRoutes)
      .use(commentsRoutes)
      .use(feedRoutes)
      .use(searchRoutes)
      .use(notificationsRoutes)
      .use(stripeRoutes)
      .use(imageRoutes),
  )

  .listen(process.env.PORT || 3001);

// Start cron jobs
import { startCronJobs } from "./services/cron";
startCronJobs();

logger.info(
  {
    host: app.server?.hostname,
    port: app.server?.port,
    docs: `http://localhost:${app.server?.port}/docs`,
  },
  "🎬 PixelReel API started",
);

export type App = typeof app;
