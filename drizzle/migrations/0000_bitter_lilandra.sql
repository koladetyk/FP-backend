CREATE TABLE "auction_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"block_number" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"noun_id" integer NOT NULL,
	"eth_price" double precision NOT NULL,
	"usd_price" double precision NOT NULL,
	"bidder_address" text NOT NULL,
	"bidder_ens" text,
	"winner_address" text,
	"winner_ens" text,
	"thumbnail_url" text,
	"headline" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auction_events_tx_hash_unique" UNIQUE("tx_hash")
);
