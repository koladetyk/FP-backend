// packages/indexer/src/api/index.ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    message: "Nouns Auction Indexer API",
    status: "running"
  });
});

app.get("/events", (c) => {
  return c.json({
    message: "Auction events endpoint",
    // We can add queries to our Ponder database here later
  });
});

export default app;