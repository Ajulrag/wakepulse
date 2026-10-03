import {
  SCHEDULER_ENABLED,
  SCHEDULER_INTERVAL_MS,
  SCHEDULER_MAX_CONCURRENCY,
} from "../config/scheduler.js";
import {
  getDueServices,
  pingService,
} from "../services/service.service.js";
import { runWithConcurrency } from "./concurrency.js";

let schedulerTimer: ReturnType<typeof setInterval> | null =
  null;

let schedulerRunning = false;

const inFlightServices = new Set<string>();

async function runSchedulerCycle(): Promise<void> {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;

  try {
    const now = new Date();

    const dueServices = await getDueServices(now);

    console.log(
      `WakePulse scheduler found ${dueServices.length} due service(s)`,
    );

    await runWithConcurrency(
      dueServices,
      SCHEDULER_MAX_CONCURRENCY,
      async (service) => {
        if (!service._id) {
          return;
        }

        const serviceId = service._id.toString();

        if (inFlightServices.has(serviceId)) {
          console.log(
            `WakePulse scheduler skipped service "${service.name}" because a check is already running`,
          );

          return;
        }

        inFlightServices.add(serviceId);

        try {
          await pingService(
            service.userId.toString(),
            serviceId,
          );

          console.log(
            `WakePulse scheduler checked service "${service.name}"`,
          );
        } catch (error) {
          console.error(
            `WakePulse scheduler failed to check service "${service.name}":`,
            error,
          );
        } finally {
          inFlightServices.delete(serviceId);
        }
      },
    );
  } catch (error) {
    console.error(
      "WakePulse scheduler cycle failed:",
      error,
    );
  } finally {
    schedulerRunning = false;
  }
}

export function startServiceScheduler(): void {
  if (!SCHEDULER_ENABLED) {
    console.log(
      "WakePulse scheduler is disabled",
    );

    return;
  }

  if (schedulerTimer) {
    console.log(
      "WakePulse scheduler is already running",
    );

    return;
  }

  console.log(
    `WakePulse scheduler started (${SCHEDULER_INTERVAL_MS}ms interval)`,
  );

  schedulerTimer = setInterval(
    () => {
      void runSchedulerCycle();
    },
    SCHEDULER_INTERVAL_MS,
  );
}

export function stopServiceScheduler(): void {
  if (!schedulerTimer) {
    return;
  }

  clearInterval(schedulerTimer);
  schedulerTimer = null;

  console.log(
    "WakePulse scheduler stopped",
  );
}