import { Router } from "express";
import { db, auctionEvents } from "../db";
import { desc, eq, ilike } from "drizzle-orm";

export const router = Router();

// GET /headlines?page=1&limit=10
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get the paginated data
    const data = await db
      .select()
      .from(auctionEvents)
      .orderBy(desc(auctionEvents.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count with better error handling
    let total = 0;
    try {
      // Alternative approach - get all records and count them
      const allRecords = await db
        .select({ id: auctionEvents.id })
        .from(auctionEvents);
      
      total = allRecords.length;
      console.log("🧪 Total records found:", total);
      
    } catch (countError) {
      console.error("Error getting count:", countError);
      // Fallback: use data length if count fails
      total = data.length;
    }

    const hasNextPage = offset + limit < total;

    console.log(`📊 Page ${page}, Limit ${limit}, Total ${total}, HasNext ${hasNextPage}`);

    res.json({
      data,
      page,
      total, // Include total in response for debugging
      hasNextPage,
    });

  } catch (error) {
    console.error("Error in headlines route:", error);
    res.status(500).json({ 
      error: "Failed to fetch headlines",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});


// GET /headlines/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [result] = await db
    .select()
    .from(auctionEvents)
    .where(eq(auctionEvents.id, id));

  if (!result) {
    return res.status(404).json({ error: "Headline not found" });
  }
  res.json(result);
});

// GET /headlines?search=eth
router.get("/search/query", async (req, res) => {
  const term = req.query.query as string;
  if (!term) return res.status(400).json({ error: "Missing query term" });

  const results = await db
    .select()
    .from(auctionEvents)
    .where(ilike(auctionEvents.headline, `%${term}%`))
    .orderBy(desc(auctionEvents.createdAt))
    .limit(10);
  res.json(results);
});
