import { pgTable, unique, serial, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const auctionEvents = pgTable("auction_events", {
	id: serial().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	blockNumber: integer("block_number").notNull(),
	txHash: text("tx_hash").notNull(),
	nounId: integer("noun_id").notNull(),
	ethPrice: doublePrecision("eth_price").notNull(),
	usdPrice: doublePrecision("usd_price").notNull(),
	bidderAddress: text("bidder_address").notNull(),
	bidderEns: text("bidder_ens"),
	winnerAddress: text("winner_address"),
	winnerEns: text("winner_ens"),
	thumbnailUrl: text("thumbnail_url"),
	headline: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("auction_events_tx_hash_unique").on(table.txHash),
]);
