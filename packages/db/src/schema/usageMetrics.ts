import {
  pgTable,
  text,
  real,
  bigint,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const usageMetrics = pgTable(
  "usage_metrics",
  {
    hostId: text("host_id").notNull(), // server / container / pod id

    // Timestamp precise to milliseconds (suitable for 5s interval)
    timestamp: timestamp("timestamp", {
      precision: 3,
      mode: "date",
    }).notNull(),

    // CPU metrics
    cpuPercentage: real("cpu_percentage").notNull(), // 0-100%

    // RAM metrics
    ramPercentage: real("ram_percentage").notNull(), // 0-100%
    ramUsedBytes: bigint("ram_used_bytes", { mode: "number" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.hostId, table.timestamp] }),
    hostTimeIdx: index("usage_metrics_host_time_idx").on(
      table.hostId,
      table.timestamp
    ),
  })
);
