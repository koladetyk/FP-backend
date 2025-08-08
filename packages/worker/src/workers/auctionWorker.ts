import { Worker } from "bullmq";
import { db } from "../../../../drizzle/schema/index";
import { auctionEvents } from "../../../../drizzle/schema/schema";
import { eventQueue } from "../queues";
import IORedis from "ioredis";

import { getEthPrice } from "../jobs/getEthPrice"; // 🔁 New
import { resolveENS } from "../jobs/resolveEns";   // 🔁 New

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "auction-events",
  async (job) => {
    const data = job.data;

    const ethPrice = await getEthPrice();
    const winnerEns = await resolveENS(data.winner);
    const bidderEns = data.bidder ? await resolveENS(data.bidder) : null;

    await db.insert(auctionEvents).values({
      ...data,
      ethPrice: ethPrice.toString(),
      winnerEns,
      bidderEns,
      timestamp: new Date(),
    }).onConflictDoNothing();

    console.log("✅ Job processed:", data.txHash);
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error("❌ Job failed:", job?.id, err);
});
