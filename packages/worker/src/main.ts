// packages/worker/src/main.ts
import * as dotenv from "dotenv";
import path from "path";

// Load .env from project root (works both locally and in Docker)
const envPath = process.env.NODE_ENV === 'development' 
  ? path.resolve(__dirname, "../../../.env")  // Local development
  : path.resolve(__dirname, "../../.env");    // Docker (adjust as needed)

console.log("🔧 Loading environment from:", envPath);

// IMPORTANT: Check REDIS_URL BEFORE loading dotenv
console.log("📍 REDIS_URL before dotenv:", process.env.REDIS_URL);

dotenv.config({ path: envPath });

// Also try loading from current directory and parent directories as fallback
dotenv.config();

// IMPORTANT: Check REDIS_URL AFTER loading dotenv
console.log("📍 REDIS_URL after dotenv:", process.env.REDIS_URL);

import { Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "../../../drizzle/schema";
import { auctionEvents } from "../../../drizzle/schema/schema";
import { getEthPrice } from "./jobs/getEthPrice";
import { resolveENS } from "./jobs/resolveEns";

console.log("🔍 Environment check:", {
  REDIS_URL: process.env.REDIS_URL ? "✅ Set" : "❌ Missing",
  REDIS_URL_VALUE: process.env.REDIS_URL, // Show the actual value
  DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
  NODE_ENV: process.env.NODE_ENV || "undefined"
});

// Add explicit check for Redis URL
if (!process.env.REDIS_URL) {
  console.error("❌ REDIS_URL is not set! Using fallback...");
  process.env.REDIS_URL = "redis://redis:6379";
}

console.log("🔗 Creating Redis connection with URL:", process.env.REDIS_URL);

const redisConfig = {
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  lazyConnect: false,
};

console.log("🔧 Redis config:", redisConfig);
const connection = new IORedis(redisConfig);

// Test Redis connection
connection.on('connect', () => {
  console.log("✅ Redis connected");
});

connection.on('error', (err) => {
  console.error("❌ Redis connection error:", err.message);
});

// Worker-only version of insertAuctionEvent (no server import)
const insertAuctionEventWorker = async (payload: any) => {
  try {
    console.log(`🔄 Processing ${payload.eventType} for Noun #${payload.nounId}`);
        
    // Get ETH price
    const ethPrice = await getEthPrice();
    
    // Calculate USD price for bid/settled events
    let usdPrice = null;
    if (payload.value || payload.amount) {
      const ethAmount = payload.value || payload.amount;
      const ethInWei = parseFloat(ethAmount) / 1e18; // Convert wei to ETH
      usdPrice = Math.round(ethInWei * ethPrice); // Calculate USD value
    }

    // Generate headline
    let headline = `Noun #${payload.nounId} ${payload.eventType.toLowerCase()}`;
    if (payload.eventType === 'AuctionBid' || payload.eventType === 'AuctionSettled') {
      const ethAmount = payload.value || payload.amount;
      const ethInWei = parseFloat(ethAmount) / 1e18;
      headline += ` for ${ethInWei.toFixed(2)} ETH`;
      if (usdPrice) {
        headline += ` ($${usdPrice.toLocaleString()})`;
      }
    }
        
    // Resolve ENS names (with null fallback for invalid addresses)
    const winnerENS = payload.winnerAddress ? await resolveENS(payload.winnerAddress) : null;
    const bidderENS = payload.bidderAddress ? await resolveENS(payload.bidderAddress) : null;

    // Ensure timestamps are proper Date objects
    const currentTime = new Date();
        
    const enrichedPayload = {
      ...payload,
      ethPrice: ethPrice.toString(),
      usdPrice: usdPrice, // Add calculated USD price
      headline: headline, // Add generated headline
      winnerEns: winnerENS,
      bidderEns: bidderENS,
      // Force proper Date objects
      timestamp: payload.timestamp ? new Date(payload.timestamp) : currentTime,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : currentTime,
    };

    console.log("📅 Timestamp check:", {
      timestamp: enrichedPayload.timestamp,
      timestampType: typeof enrichedPayload.timestamp,
      createdAt: enrichedPayload.createdAt,
      createdAtType: typeof enrichedPayload.createdAt,
    });

    // Insert into database (idempotent)
    await db.insert(auctionEvents).values(enrichedPayload).onConflictDoNothing();

    // Send notification to Redis for API server to broadcast
    await connection.publish('auction_event', JSON.stringify({
      ...enrichedPayload,
      // Convert dates to ISO strings for JSON serialization
      timestamp: enrichedPayload.timestamp.toISOString(),
      createdAt: enrichedPayload.createdAt.toISOString(),
    }));

    console.log("✅ Auction event processed:", {
      eventType: enrichedPayload.eventType,
      nounId: enrichedPayload.nounId,
      ethPrice: ethPrice,
      usdPrice: usdPrice,
      headline: headline,
      winnerEns: winnerENS,
      bidderEns: bidderENS
    });
        
    return enrichedPayload;
  } catch (error) {
    console.error("❌ Error processing auction event:", error);
    throw error;
  }
};

// Main auction events worker with detailed logging
const auctionWorker = new Worker(
  "auction-events",
  async (job) => {
    console.log("🔄 Processing job:", job.id, "Job Name:", job.name, "Job Data EventType:", job.data.eventType);
            
    try {
      await insertAuctionEventWorker(job.data);
      console.log("✅ Job completed:", job.data.txHash);
    } catch (error) {
      console.error("❌ Job failed:", error);
      throw error;
    }
  },
  { 
    connection,
    concurrency: 5,
  }
);

// Add more detailed event listeners
auctionWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} (${job.name}) completed successfully`);
});

auctionWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} (${job?.name}) failed:`, err.message);
});

auctionWorker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

auctionWorker.on("ready", () => {
  console.log("🟢 Worker is ready and waiting for jobs");
});

auctionWorker.on("active", (job) => {
  console.log(`🔄 Job ${job.id} (${job.name}) is now active`);
});

console.log("🚀 Auction worker started, waiting for jobs...");