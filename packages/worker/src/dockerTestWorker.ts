// packages/worker/src/dockerTestWorker.ts
import * as dotenv from "dotenv";
dotenv.config({ path: "../../../.env" });

import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisConfig = {
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  lazyConnect: false,
};

console.log('🔗 Docker TestWorker Redis config:', redisConfig);
const connection = new IORedis(redisConfig);

connection.on('connect', () => {
  console.log("✅ Docker TestWorker Redis connected");
});

const auctionQueue = new Queue("auction-events", { connection });

async function dockerTestWorker() {
  const uniqueNounId = Math.floor(Math.random() * 9000) + 1000;
  const uniqueEthPrice = (Math.random() * 100 + 10).toFixed(2);
  const eventTypes = ["AuctionCreated", "AuctionBid", "AuctionSettled"];
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  const mockPayload = {
    eventType,
    nounId: uniqueNounId,
    blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
    txHash: `0x${Math.random().toString(16).substring(2, 18)}${Date.now().toString(16)}`,
    ethPrice: parseFloat(uniqueEthPrice),
    usdPrice: Math.floor(parseFloat(uniqueEthPrice) * (2500 + Math.random() * 1000)),
    bidderAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    headline: `Noun #${uniqueNounId} ${eventType.toLowerCase()} for ${uniqueEthPrice} ETH`,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  console.log("🔄 Adding job from Docker...");
  console.log("📊 Data:", {
    nounId: mockPayload.nounId,
    eventType: mockPayload.eventType,
    ethPrice: `${mockPayload.ethPrice} ETH`
  });

  const job = await auctionQueue.add("auction-event", mockPayload);
  console.log(`✅ Job ${job.id} added!`);
  
  await connection.quit();
}

dockerTestWorker().catch(console.error);
