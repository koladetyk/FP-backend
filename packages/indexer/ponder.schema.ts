// packages/indexer/ponder.schema.ts
import { onchainTable } from "ponder";

export const auctionEvent = onchainTable("auction_event", (t) => ({
  id: t.text().primaryKey(),
  eventType: t.text().notNull(),
  nounId: t.integer().notNull(),
  blockNumber: t.integer().notNull(),
  processed: t.boolean().default(false),
}));