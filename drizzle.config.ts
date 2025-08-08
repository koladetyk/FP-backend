import "dotenv/config"; // Make sure this line is present to load .env variables
import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
