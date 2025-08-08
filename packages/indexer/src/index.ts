// packages/indexer/src/index.ts
import { ponder } from "ponder:registry";
import schema from "ponder:schema";
import { Queue } from "bullmq";
import IORedis from "ioredis";

console.log("🎩 Ponder indexer starting...");

// Use different Redis URL for Docker vs local
const redisUrl = process.env.DOCKER_ENV 
  ? "redis://redis:6379"  // Docker: use service name
  : process.env.REDIS_URL || "redis://localhost:6379";  // Local: use localhost

console.log("🔗 Ponder connecting to Redis:", redisUrl);

const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  lazyConnect: false,
});

// Test Redis connection
redis.on('connect', () => {
  console.log("✅ Ponder Redis connected successfully");
});

redis.on('error', (err) => {
  console.error("❌ Ponder Redis connection error:", err.message);
});

const queue = new Queue("auction-events", { connection: redis });

// Helper function to process events and queue them
async function processAndQueueEvent(eventData: any) {
  try {
    // 🔧 FIXED: Use "auction-event" to match your worker expectation
    await queue.add('auction-event', eventData, {
      jobId: `blockchain-${eventData.txHash}`,
      removeOnComplete: 10,
      removeOnFail: 5,
    });
        
    console.log(`🔄 Queued for enrichment: ${eventData.eventType} for Noun #${eventData.nounId}`);
  } catch (error) {
    console.error(`❌ Failed to queue event: ${error.message}`);
  }
}

ponder.on("AuctionHouse:AuctionCreated", async ({ event, context }) => {
  console.log(`🔗 AuctionCreated: Noun #${event.args.nounId} at block ${event.block.number}`);
    
  // Store in Ponder's database
  await context.db.insert(schema.auctionEvent).values({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "AuctionCreated",
    nounId: Number(event.args.nounId),
    blockNumber: Number(event.block.number),
    processed: false,
  });

  // Queue for your enrichment pipeline
  await processAndQueueEvent({
    eventType: "AuctionCreated",
    blockNumber: Number(event.block.number),
    txHash: event.transaction.hash,
    nounId: Number(event.args.nounId),
    startTime: event.args.startTime.toString(),
    endTime: event.args.endTime.toString(),
    timestamp: new Date(Number(event.block.timestamp) * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    source: 'blockchain'
  });
});

ponder.on("AuctionHouse:AuctionBid", async ({ event, context }) => {
  console.log(`🔗 AuctionBid: Noun #${event.args.nounId} - ${event.args.value} ETH`);
    
  // Store in Ponder's database
  await context.db.insert(schema.auctionEvent).values({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "AuctionBid",
    nounId: Number(event.args.nounId),
    blockNumber: Number(event.block.number),
    processed: false,
  });

  // Queue for your enrichment pipeline
  await processAndQueueEvent({
    eventType: "AuctionBid",
    blockNumber: Number(event.block.number),
    txHash: event.transaction.hash,
    nounId: Number(event.args.nounId),
    bidderAddress: event.args.sender, // 🔧 FIXED: Use bidderAddress to match worker schema
    value: event.args.value.toString(),
    extended: event.args.extended,
    timestamp: new Date(Number(event.block.timestamp) * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    source: 'blockchain'
  });
});

ponder.on("AuctionHouse:AuctionSettled", async ({ event, context }) => {
  console.log(`🔗 AuctionSettled: Noun #${event.args.nounId} won by ${event.args.winner}`);
    
  // Store in Ponder's database
  await context.db.insert(schema.auctionEvent).values({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "AuctionSettled", 
    nounId: Number(event.args.nounId),
    blockNumber: Number(event.block.number),
    processed: false,
  });

  // Queue for your enrichment pipeline
  await processAndQueueEvent({
    eventType: "AuctionSettled",
    blockNumber: Number(event.block.number),
    txHash: event.transaction.hash,
    nounId: Number(event.args.nounId),
    winnerAddress: event.args.winner, // 🔧 FIXED: Use winnerAddress to match worker schema
    amount: event.args.amount.toString(),
    timestamp: new Date(Number(event.block.timestamp) * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    source: 'blockchain'
  });
});

console.log("🎩 Ponder indexer loaded - streaming to BullMQ pipeline...");