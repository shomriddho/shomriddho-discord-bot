import { env } from "@shomriddho-discord-bot/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initBot } from "./bot/index.js";
import { db } from "@shomriddho-discord-bot/db";
import { usageMetrics } from "@shomriddho-discord-bot/db/schema";
import os from "os";

// Import pidusage for accurate process CPU & RAM
// @ts-ignore
import pidusage from "pidusage";

/** -----------------------------
 *  System Metrics Collector (process-based)
 *  -----------------------------
 */
async function getSystemMetrics() {
  // Get metrics for THIS process
  const stats = await pidusage(process.pid);

  const cpuPercentage = stats.cpu; // % CPU used by this process
  const ramUsedBytes = stats.memory; // RAM in bytes

  // RAM percentage relative to container limit (optional)
  const containerLimitBytes = process.env.CONTAINER_RAM
    ? Number(process.env.CONTAINER_RAM)
    : 512 * 1024 * 1024; // default 512MB
  const ramPercentage = (ramUsedBytes / containerLimitBytes) * 100;

  return {
    cpuPercentage,
    ramPercentage,
    ramUsedBytes,
  };
}

/** -----------------------------
 *  Metrics Interval
 *  -----------------------------
 */
function startMetricsCollection() {
  const hostId = os.hostname();

  setInterval(async () => {
    try {
      const { cpuPercentage, ramPercentage, ramUsedBytes } =
        await getSystemMetrics();

      const timestamp = new Date();

      await db.insert(usageMetrics).values({
        hostId,
        timestamp,
        cpuPercentage,
        ramPercentage,
        ramUsedBytes,
      });

      console.log(
        `Metrics inserted: CPU ${cpuPercentage.toFixed(
          2
        )}%, RAM ${ramPercentage.toFixed(2)}%, Used ${
          ramUsedBytes / 1_000_000
        } MB`
      );
    } catch (error) {
      console.error("Error collecting metrics:", error);
    }
  }, 5000);
}

/** -----------------------------
 *  Hono API Setup
 *  -----------------------------
 */
const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/", (c) => {
  return c.json({
    status: "ok",
    name: "Example API",
    version: "1.0.0",
  });
});

/** -----------------------------
 *  Bun Main Entry
 *  -----------------------------
 */
if (import.meta.main) {
  const port = Number(process.env.PORT) || 3000;

  console.log(`Server is running on http://localhost:${port}`);

  // Start Bun server
  Bun.serve({
    port,
    fetch: app.fetch,
  });

  // Initialize your bot
  initBot();

  // Start metrics collection
  startMetricsCollection();
}
