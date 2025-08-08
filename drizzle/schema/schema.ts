// drizzle/schema/schema.ts
import { pgTable, serial, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const auctionEvents = pgTable("auction_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  blockNumber: integer("block_number").notNull(),
  txHash: text("tx_hash").notNull().unique(),
  nounId: integer("noun_id").notNull(),
  ethPrice: doublePrecision("eth_price").notNull(),
  usdPrice: doublePrecision("usd_price").notNull(),
  bidderAddress: text("bidder_address").notNull(),
  bidderEns: text("bidder_ens"),
  winnerAddress: text("winner_address"),
  winnerEns: text("winner_ens"),
  thumbnailUrl: text("thumbnail_url"),
  headline: text("headline").notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
