const schedulerEnabled =
  process.env.SCHEDULER_ENABLED !== "false";

const schedulerIntervalMs = Number(
  process.env.SCHEDULER_INTERVAL_MS || 30000,
);

const schedulerMaxConcurrency = Number(
  process.env.SCHEDULER_MAX_CONCURRENCY || 5,
);

if (
  !Number.isInteger(schedulerIntervalMs) ||
  schedulerIntervalMs < 1000
) {
  throw new Error(
    "SCHEDULER_INTERVAL_MS must be an integer of at least 1000ms",
  );
}

if (
  !Number.isInteger(schedulerMaxConcurrency) ||
  schedulerMaxConcurrency < 1 ||
  schedulerMaxConcurrency > 50
) {
  throw new Error(
    "SCHEDULER_MAX_CONCURRENCY must be an integer between 1 and 50",
  );
}

export const SCHEDULER_ENABLED = schedulerEnabled;

export const SCHEDULER_INTERVAL_MS =
  schedulerIntervalMs;

export const SCHEDULER_MAX_CONCURRENCY =
  schedulerMaxConcurrency;