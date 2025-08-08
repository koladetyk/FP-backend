// packages/worker/src/queues/index.ts

import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const connection = new IORedis(process.env.REDIS_URL!);

// Define your queue
export const eventQueue = new Queue("auction-events", { connection });
