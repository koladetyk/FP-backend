// packages/api/src/routes/auth.ts
import { Router } from "express";
import { SiweMessage } from "siwe";
import crypto from "crypto";

const router = Router();

// Generate nonce endpoint  
router.get("/nonce", (req, res) => {
  try {
    const nonce = crypto.randomUUID().replace(/-/g, '');
    
    console.log("🎲 Generated nonce:", nonce);
    req.session.nonce = nonce;
    res.json({ nonce });
  } catch (error) {
    console.error("❌ Nonce generation error:", error);
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    console.log("\n🔐 === LOGIN ATTEMPT ===");
    const { message, signature } = req.body;

    if (!message || !signature) {
      return res.status(400).json({ error: "Missing message or signature" });
    }

    console.log("📝 Received message:\n", message);
    console.log("✍️ Received signature:", signature);

    // Parse SIWE message
    const siwe = new SiweMessage(message);
    console.log("✅ SIWE message parsed successfully");

    // Check nonce
    if (siwe.nonce !== req.session.nonce) {
      console.error("❌ Nonce mismatch");
      return res.status(422).json({ error: "Invalid nonce" });
    }

    // SIWE v2 validation
    try {
      const fields = await siwe.validate(signature);
      console.log("✅ Signature validation successful for:", fields.address);

      // Store session
      req.session.siwe = fields;
      req.session.nonce = undefined;

      res.json({ ok: true, address: fields.address });
    } catch (validationError) {
      console.error("❌ SIWE v2 validation failed, trying alternative method:", validationError);
      
      // Alternative validation for different SIWE versions
      try {
        const result = await siwe.verify({ signature });
        if (result.success) {
          req.session.siwe = siwe;
          req.session.nonce = undefined;
          res.json({ ok: true, address: siwe.address });
        } else {
          throw new Error("Verification failed");
        }
      } catch (altError) {
        console.error("❌ Alternative validation also failed:", altError);
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(401).json({ error: "Authentication failed" });
  }
});

// Get current user
router.get("/me", (req, res) => {
  if (!req.session.siwe) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: req.session.siwe });
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ ok: true });
  });
});

export default router;