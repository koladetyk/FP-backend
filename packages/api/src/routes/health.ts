// packages/api/src/routes/health.ts
import { Router } from "express";
import IORedis from "ioredis";

const router = Router();

// Create a separate Redis connection for health checks (not subscriber mode)
const healthRedis = new IORedis(process.env.REDIS_URL || "redis://redis:6379");

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/metrics", async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    
    // Use separate Redis connection for commands
    const redisKeys = await healthRedis.dbsize(); // number of keys in Redis
    
    res.status(200).json({
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
      redisKeys,
    });
  } catch (error) {
    console.error("❌ Error getting metrics:", error);
    res.status(500).json({
      error: "Failed to get metrics",
      uptime: `${Math.floor(process.uptime())}s`,
      memory: process.memoryUsage(),
      redisKeys: "unavailable"
    });
  }
});

export default router;