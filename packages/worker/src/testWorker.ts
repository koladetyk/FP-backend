// packages/worker/src/testWorker.ts
import * as dotenv from "dotenv";
dotenv.config({ path: "../../../.env" });

import { Queue } from "bullmq";
import IORedis from "ioredis";

// Use the correct Redis config for LOCAL execution (outside Docker)
const redisConfig = {
  host: 'localhost',  // Use localhost when running locally
  port: 6379,         // Docker maps redis:6379 -> localhost:6379
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  lazyConnect: false,
};

console.log('🔗 TestWorker Redis config:', redisConfig);
const connection = new IORedis(redisConfig);

// Test connection
connection.on('connect', () => {
  console.log("✅ TestWorker Redis connected");
});

connection.on('error', (err) => {
  console.error("❌ TestWorker Redis error:", err.message);
});

//const auctionQueue = new Queue("auction-events", { connection });

const auctionQueue = new Queue("auction-events", { connection });

async function testWorker() {
  const currentTime = new Date();
  
  // Generate unique values
  const uniqueNounId = Math.floor(Math.random() * 9000) + 1000; // Random between 1000-9999
  const uniqueBlockNumber = Math.floor(Math.random() * 1000000) + 18000000; // Realistic block numbers
  const uniqueEthPrice = (Math.random() * 100 + 10).toFixed(2); // Random ETH price 10-110
  const uniqueUsdPrice = Math.floor(parseFloat(uniqueEthPrice) * (2000 + Math.random() * 1000)); // ETH * $2000-3000

  // Array of different addresses for variety
  const testAddresses = [
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
    "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10", // Nouns DAO Treasury
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Test address 1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Test address 2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Test address 3
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Test address 4
  ];

  const bidderAddress = testAddresses[Math.floor(Math.random() * testAddresses.length)];
  const winnerAddress = testAddresses[Math.floor(Math.random() * testAddresses.length)];

  // Random event types for variety
  const eventTypes = ["AuctionCreated", "AuctionBid", "AuctionSettled"];
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  const mockPayload = {
    id: Math.floor(Math.random() * 10000),
    eventType,
    blockNumber: uniqueBlockNumber,
    txHash: `0x${Math.random().toString(16).substring(2, 18)}${Date.now().toString(16)}`,
    nounId: uniqueNounId,
    ethPrice: parseFloat(uniqueEthPrice),
    usdPrice: uniqueUsdPrice,
    bidderAddress,
    bidderEns: null, // Let the worker resolve this
    winnerAddress: eventType === "AuctionSettled" ? winnerAddress : null,
    winnerEns: null, // Let the worker resolve this
    thumbnailUrl: `https://nouns.wtf/noun${uniqueNounId}.png`,
    headline: `Noun #${uniqueNounId} ${eventType.toLowerCase()} for ${uniqueEthPrice} ETH ($${uniqueUsdPrice.toLocaleString()})`,
    // Send timestamps as ISO strings to avoid serialization issues
    timestamp: currentTime.toISOString(),
    createdAt: currentTime.toISOString(),
  };

  console.log("🔄 Adding job to queue...");
  console.log("📊 Generated data:", {
    nounId: mockPayload.nounId,
    blockNumber: mockPayload.blockNumber,
    eventType: mockPayload.eventType,
    ethPrice: `${mockPayload.ethPrice} ETH`,
    usdPrice: `$${mockPayload.usdPrice.toLocaleString()}`
  });
  console.log("📅 Payload timestamps:", {
    timestamp: mockPayload.timestamp,
    createdAt: mockPayload.createdAt
  });

  // Use "auction-event" as the job name (matches what main worker expects)
  const job = await auctionQueue.add("auction-event", mockPayload);

  console.log(`✅ Job ${job.id} added to queue!`);
  console.log("👀 Check your worker terminal to see it get processed");

  await connection.quit();
}

testWorker().catch(console.error);