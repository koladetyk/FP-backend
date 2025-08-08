import { db } from "../../../../drizzle/schema";
import { auctionEvents } from "../../../../drizzle/schema/schema";
import { io } from "../../../api/src/server";
import { getEthPrice } from "../jobs/getEthPrice"; // 🔁 New
import { resolveENS } from "../jobs/resolveEns";   // 🔁 New

export const insertAuctionEvent = async (payload: any) => {
  const ethPrice = await getEthPrice();
  const winnerENS = await resolveENS(payload.winner);
  const bidderENS = payload.bidder ? await resolveENS(payload.bidder) : null;

  const enrichedPayload = {
    ...payload,
    ethPrice,
    winnerEns: winnerENS,
    bidderEns: bidderENS,
    timestamp: new Date(),
  };

  const result = await db.insert(auctionEvents).values(enrichedPayload);

  // Broadcast to connected WebSocket clients
  io.emit("newHeadline", enrichedPayload);

  console.log("✅ Headline inserted and broadcasted:", enrichedPayload.headline);
};
