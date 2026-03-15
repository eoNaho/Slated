/**
 * Cron Jobs Service
 * Background tasks that run on schedule
 */

import { loggers } from "../utils/logger";

const log = loggers.cron;

// Simple cron-like scheduler using setInterval
const jobs: {
  name: string;
  interval: number;
  fn: () => Promise<void>;
  timer?: NodeJS.Timer;
}[] = [];

export function registerJob(
  name: string,
  intervalMs: number,
  fn: () => Promise<void>
): void {
  jobs.push({ name, interval: intervalMs, fn });
}

export function startCronJobs(): void {
  log.info("Starting cron jobs...");

  // Cleanup expired sessions/tokens every hour
  registerJob("cleanup-sessions", 60 * 60 * 1000, async () => {
    log.info("Running session cleanup");
    // Would delete expired sessions from DB
  });

  // Update user stats every 6 hours
  registerJob("update-stats", 6 * 60 * 60 * 1000, async () => {
    log.info("Updating user statistics");
    // Would recalculate user stats
  });

  // Check subscription status daily
  registerJob("check-subscriptions", 24 * 60 * 60 * 1000, async () => {
    log.info("Checking subscription statuses");
    // Would verify Stripe subscription status
  });

  // Start all jobs
  for (const job of jobs) {
    job.timer = setInterval(async () => {
      try {
        await job.fn();
      } catch (error) {
        log.error({ err: error, job: job.name }, "Cron job failed");
      }
    }, job.interval);

    log.info(
      { job: job.name, intervalMs: job.interval },
      "Registered cron job"
    );
  }

  log.info(`Started ${jobs.length} cron jobs`);
}

export function stopCronJobs(): void {
  for (const job of jobs) {
    if (job.timer) {
      clearInterval(job.timer);
    }
  }
  log.info("Stopped all cron jobs");
}
