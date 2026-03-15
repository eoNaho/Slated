import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins/two-factor";
import { username } from "better-auth/plugins/username";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";
import * as schema from "./db/schema";
import { emailService } from "./services/email";

const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB — OWASP recommended
  timeCost: 3,
  parallelism: 4,
};

export const auth = betterAuth({
  // Drizzle adapter — BA finds user/session/account/verification tables from our schema
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  // Use UUID for all generated IDs (matches our existing uuid PK columns)
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  // ── Email & Password ──────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    password: {
      hash: (password) => hash(password, ARGON2_OPTIONS),
      verify: ({ hash: hashed, password }) => verify(hashed, password),
    },
    sendResetPassword: async ({ user, url }) => {
      await emailService.sendPasswordResetEmail(user.email, url);
    },
  },

  // ── Email Verification ────────────────────────────────────
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await emailService.send({
        to: user.email,
        subject: "Verify your PixelReel account",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #a855f7;">Welcome to PixelReel!</h1>
            <p>Click the button below to verify your account:</p>
            <a href="${url}" style="display: inline-block; background: #a855f7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Verify Email
            </a>
            <p style="color: #666; font-size: 12px;">If you didn't create this account, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
    sendOnSignUp: true,
  },

  // ── OAuth Providers ───────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || "",
      clientSecret: process.env.APPLE_CLIENT_SECRET || "",
      appBundleIdentifier: process.env.APPLE_BUNDLE_ID || "",
    },
  },

  // ── Plugins ───────────────────────────────────────────────
  plugins: [
    // TOTP 2FA with backup codes — fully integrated into login flow
    twoFactor({
      issuer: "PixelReel",
    }),
    // Unique username support
    username(),
  ],

  // ── User field mapping ────────────────────────────────────
  // Tell Better Auth which field names we use in our schema
  // (our columns use displayName/avatarUrl/isVerified instead of name/image/emailVerified)
  user: {
    fields: {
      name: "displayName",
      image: "avatarUrl",
      emailVerified: "isVerified",
    },
    // Expose PixelReel custom fields in session data
    additionalFields: {
      bio: { type: "string", nullable: true },
      coverUrl: { type: "string", nullable: true },
      location: { type: "string", nullable: true },
      website: { type: "string", nullable: true },
      isPremium: { type: "boolean", defaultValue: false },
      role: { type: "string", defaultValue: "user" },
      status: { type: "string", defaultValue: "active" },
      lastActiveAt: { type: "date", nullable: true },
    },
  },

  // ── Session ───────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-min cache reduces DB hits per request
    },
  },

  // ── Database hooks ────────────────────────────────────────
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // Auto-generate username for OAuth users (Apple/Google don't provide one)
          if (!(userData as any).username) {
            const base = userData.email
              .split("@")[0]
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "_")
              .slice(0, 20);
            const suffix = Math.random().toString(36).slice(2, 6);
            (userData as any).username = `${base}_${suffix}`;
          }
          return { data: userData };
        },
      },
    },
  },

  // ── Trusted origins (CSRF protection) ────────────────────
  trustedOrigins: [
    process.env.FRONTEND_URL || "https://pixelreel.com",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
