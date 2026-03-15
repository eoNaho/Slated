import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

// Base logger
export const logger = pino({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

// Namespaced loggers
export const loggers = {
  http: logger.child({ module: "http" }),
  auth: logger.child({ module: "auth" }),
  db: logger.child({ module: "db" }),
  stripe: logger.child({ module: "stripe" }),
  email: logger.child({ module: "email" }),
  cron: logger.child({ module: "cron" }),
};
