import { env } from "@shomriddho-discord-bot/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initBot } from "./bot/index.js";
import { db } from "@shomriddho-discord-bot/db";
import { usageMetrics } from "@shomriddho-discord-bot/db/schema";
import os from "os";

// Get system-wide CPU & RAM usage
async function getSystemMetrics() {
  // CPU percentage calculation
  // os.cpus() gives cumulative times for each core
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
  const ramUsedBytes = usedRam;
  const ramPercentage = (usedRam / totalRam) * 100;

  return {
    cpuPercentage,
    ramPercentage,
    ramUsedBytes,
  };
}
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

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);
Bun.serve({
  port,
  fetch: app.fetch,
});

initBot();

// Cron job to collect usage metrics every 5 seconds
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

export default app;
