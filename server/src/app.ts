import cors from "cors";
import express from "express";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "WakePulse API is running",
    timestamp: new Date().toISOString(),
  });
});

export default app;