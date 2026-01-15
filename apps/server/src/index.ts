import { env } from "@shomriddho-discord-bot/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initBot } from "./bot/index.js";
import { db } from "@shomriddho-discord-bot/db";
import { usageMetrics } from "@shomriddho-discord-bot/db/schema";
import os from "os";

/** -----------------------------
 *  System Metrics Collector
 *  -----------------------------
 */
function getSystemMetrics() {
  // CPU usage calculation (approximate)
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((core) => {
    const times = core.times;
    totalIdle += times.idle;
    totalTick += times.user + times.nice + times.sys + times.irq + times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const cpuPercentage = 100 - (100 * idle) / total;

  // RAM usage
  const totalRam = os.totalmem();
  const freeRam = os.freemem();
  const usedRam = totalRam - freeRam;
  const ramPercentage = (usedRam / totalRam) * 100;

  return {
    cpuPercentage,
    ramPercentage,
    ramUsedBytes: usedRam,
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
      const { cpuPercentage, ramPercentage, ramUsedBytes } = getSystemMetrics();

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
