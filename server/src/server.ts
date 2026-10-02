import "dotenv/config";

import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { initializeDatabase } from "./config/database-init.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDatabase();

    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(
        `WakePulse API running on http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error("Failed to start WakePulse:", error);
    process.exit(1);
  }
}

startServer();