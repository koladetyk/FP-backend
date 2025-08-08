import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../../drizzle/schema/schema"; // adjust path if needed

import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export const { auctionEvents } = schema;
