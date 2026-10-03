import "dotenv/config";

import app from "./app.js";
import {
  connectDatabase,
  closeDatabase,
} from "./config/database.js";
import { initializeDatabase } from "./config/database-init.js";
import {
  startServiceScheduler,
  stopServiceScheduler,
} from "./scheduler/service-scheduler.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDatabase();
  await initializeDatabase();

  startServiceScheduler();

  app.listen(PORT, () => {
    console.log(
      `WakePulse server running on port ${PORT}`,
    );
  });
}

async function shutdown(signal: string) {
  console.log(
    `Received ${signal}. Shutting down WakePulse...`,
  );

  stopServiceScheduler();

  await closeDatabase();

  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

startServer();