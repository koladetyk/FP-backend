// packages/api/src/server.ts
import express from "express";
import cors from "cors";
import http from "http";
import session from "express-session";
import { Server as SocketIOServer } from "socket.io";
import { router as headlinesRouter } from "./routes/headlines";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import IORedis from "ioredis";

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({
  origin: "http://localhost:5173", // allow frontend origin
  credentials: true               // allow cookies to be sent
}));

app.use(express.json());

// Session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "default-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
});

app.use(sessionMiddleware);

app.use("/headlines", headlinesRouter);
app.use(healthRoutes);
app.use("/api", authRoutes);

app.get("/", (_, res) => {
  res.send("Nouns Auction Tracker API");
});

// Create HTTP server and attach socket.io
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true
  },
});

// Share session middleware with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request as any, {} as any, next as any);
});

// SIWE-protected WebSocket connection
io.on("connection", (socket) => {
  const session = (socket.request as any).session;
      
  // Check if user is authenticated via SIWE
  if (!session?.siwe) {
    console.log("❌ Unauthorized WebSocket connection attempt");
    socket.emit("auth_required", { message: "Please sign in with Ethereum to access real-time feed" });
    socket.disconnect();
    return;
  }
      
  const userAddress = session.siwe.address;
  console.log(`🟢 Authenticated user connected: ${userAddress} (${socket.id})`);
      
  // Send welcome message to authenticated user
  socket.emit("connected", { 
     message: "Connected to protected feed",
    address: userAddress 
   });

  socket.on("disconnect", () => {
    console.log(`🔌 Authenticated user disconnected: ${userAddress} (${socket.id})`);
  });
});

// 🚀 Create SEPARATE Redis connection for pub/sub (subscriber mode)
const redisPubSub = new IORedis(process.env.REDIS_URL || "redis://redis:6379");

// Subscribe to Redis pub/sub for real-time updates
redisPubSub.subscribe('auction_event', (err, count) => {
  if (err) {
    console.error('❌ Failed to subscribe to auction_event channel:', err);
  } else {
    console.log(`✅ Subscribed to ${count} Redis channels (auction_event)`);
  }
});

// Listen for Redis messages and broadcast to WebSocket clients
redisPubSub.on('message', (channel, message) => {
  if (channel === 'auction_event') {
    console.log('📡 Received auction event from worker, broadcasting to WebSocket clients');
    try {
      const auctionData = JSON.parse(message);
      // Broadcast to all authenticated WebSocket clients
      io.emit('headline', auctionData.headline || message);
      console.log(`✅ Broadcasted to ${io.engine.clientsCount} connected clients`);
    } catch (error) {
      console.error('❌ Error parsing auction event message:', error);
      // Broadcast raw message as fallback
      io.emit('headline', message);
    }
  }
});

// Handle Redis pub/sub connection events
redisPubSub.on('error', (err) => {
  console.error('❌ Redis pub/sub error:', err);
});

redisPubSub.on('connect', () => {
  console.log('✅ Redis pub/sub connected');
});

// Export io to use in worker
export { io };

server.listen(PORT, () => {
  console.log(`🟢 API running on http://localhost:${PORT}`);
  console.log(`🔒 WebSocket requires SIWE authentication`);
});