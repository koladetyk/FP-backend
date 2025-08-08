# 🎩 Nouns Auction Tracker

A real-time, full-stack auction tracking system for the Nouns DAO ecosystem. Built with Ponder blockchain indexing, WebSocket streaming, and Sign-In with Ethereum authentication.

## ⚡ Quick Start

**Start the entire stack with one command:**
```bash
./start.sh
```

**Or manually with Docker + Ponder:**
```bash
# Start containerized services
docker compose up -d

# Start Ponder indexer locally (in separate terminal)
cd packages/indexer
npm run dev
```

**Test with simulated auction events:**
```bash
docker compose exec worker tsx packages/worker/src/dockerTestWorker.ts
```

**Access your applications:**
- 🌐 **Frontend**: http://localhost:5173 (React app with real-time feed)
- 🔗 **API**: http://localhost:4001 (REST + WebSocket)
- 📊 **Ponder**: http://localhost:42069 (Indexer status & GraphQL)
- 🗄️ **Database**: localhost:5433 (pgAdmin UI at localhost:8080)
- 📊 **Redis**: localhost:8082 (Redis Commander)

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   📱 Frontend   │◄──►│   🌐 API Server   │◄──►│  📊 PostgreSQL  │
│ React + Vite    │    │ Express + WS      │    │   Database      │
│   Port: 5173    │    │   Port: 4001      │    │   Port: 5433    │
└─────────────────┘    └─────────┬────────┘    └─────────────────┘
                                 │                        ▲
                    WebSocket    │ Redis Pub/Sub          │
                    Real-time    │                        │
                                 ▼                        │
                       ┌──────────────────┐    ┌─────────────────┐
┌─────────────────┐    │  📬 Job Queue     │───►│  ⚙️ Worker      │
│  🔗 Ponder      │───►│   (BullMQ)       │    │   Pipeline      │
│ Blockchain      │    │                  │    │  (Background)   │
│ Indexer (Local) │    └──────────────────┘    └─────────────────┘
│   Port: 42069   │             │                        │
└─────────────────┘             ▼                        │
         │              ┌─────────────────┐               │
         │              │  🔴 Redis       │◄──────────────┘
         └─────────────►│ Queue + Pub/Sub │               
                        │   Port: 6379    │               
                        └─────────────────┘               
                                 ▲
┌─────────────────┐              │
│  ⛓️ Ethereum     │──────────────┘
│  Mainnet        │ RPC Calls (Alchemy)
│ (via Alchemy)   │
└─────────────────┘
```

## 🚀 Core Services

### **Ponder Indexer** (Port 42069, Runs Locally)
- Real-time blockchain event indexing
- Ethereum RPC integration via Alchemy
- Job queuing to Redis for enrichment
- GraphQL API for indexed data
- **Why Local**: Avoids Docker architecture conflicts with native binaries

### **API Server** (Port 4001, Containerized)
- REST endpoints with pagination
- WebSocket server for real-time updates
- SIWE (Sign-In with Ethereum) authentication
- Redis pub/sub listener for broadcasting

### **Worker Pipeline** (Background, Containerized)
- BullMQ job processing from Ponder events
- ENS name resolution
- ETH price enrichment + USD calculation
- Headline generation
- Database persistence with conflict handling
- Redis pub/sub broadcasting

### **Frontend** (Port 5173, Containerized)
- React app with real-time auction feed
- Ethereum wallet integration
- Protected WebSocket connections
- Pagination for historical data browsing

### **Infrastructure** (Containerized)
- **PostgreSQL** (Port 5433): Auction event storage
- **Redis** (Port 6379): Job queue + pub/sub messaging
- **pgAdmin** (Port 8080): Database management UI
- **Redis Commander** (Port 8082): Queue monitoring UI

## 🔀 Hybrid Architecture Explained

### **Why Ponder Runs Locally**

We use a **hybrid setup** where Ponder runs locally while other services are containerized because of setup issues:

**🎯 Benefits:**
- **Architecture Compatibility**: Avoids Docker container architecture conflicts with native binaries (esbuild, rollup)
- **Development Speed**: Faster restarts, easier debugging, native file watching
- **Resource Efficiency**: Direct host network access, no container overhead
- **Reliability**: Eliminates Docker-specific build issues and platform mismatches

**🔧 How It Works:**
1. **Ponder** (local) indexes blockchain events → queues jobs to Redis (Docker)
2. **Worker** (Docker) processes jobs → enriches data → saves to PostgreSQL (Docker)  
3. **API** (Docker) serves data → broadcasts via WebSocket
4. **Frontend** (Docker) displays real-time auction feed

**📊 Data Flow:**
```
Ethereum → Ponder (local) → Redis (Docker) → Worker (Docker) → PostgreSQL (Docker) → API (Docker) → Frontend (Docker)
```

This pattern is common in production where critical indexing runs on dedicated infrastructure while auxiliary services are containerized.

## 📊 API Reference

### REST Endpoints
```bash
# Get paginated auction events
GET /headlines?page=1&limit=10

# Health check with system status
GET /health
GET /metrics

# Authentication (SIWE)
GET  /api/nonce          # Get signing nonce
POST /api/login          # Verify signature
POST /api/logout         # Clear session
GET  /api/me             # Current user info
```

### Ponder GraphQL
```bash
# Ponder's GraphQL API
GET http://localhost:42069

# Example queries:
query {
  auctionEvents(first: 10) {
    id
    eventType
    nounId
    blockNumber
  }
}
```

### WebSocket Events
```bash
# Connect (requires SIWE authentication)
ws://localhost:4001

# Server events:
- "connected": Welcome message
- "headline": New auction event
- "auth_required": Authentication needed
```

## 🔧 Development Workflow

### **Quick Start**
```bash
# 1. One-command setup
./start.sh

# 2. Start Ponder indexer (in separate terminal)
cd packages/indexer
npm run dev

# 3. Generate test events
docker compose exec worker tsx packages/worker/src/dockerTestWorker.ts

# 4. Visit http://localhost:5173 and sign in with MetaMask
```

### **Manual Setup**
```bash
# 1. Start Docker services
docker compose up -d

# 2. Start Ponder locally
cd packages/indexer
npm install
npm run dev

# 3. Watch logs
docker compose logs -f worker
```

### **Development Commands**
```bash
# View all service logs
docker compose logs -f

# Monitor Ponder
cd packages/indexer && npm run dev

# Restart specific service
docker compose restart [api|worker|frontend]

# Access database
docker compose exec postgres psql -U nounsuser -d nouns

# Monitor Redis jobs
docker compose exec redis redis-cli monitor

# Clean restart
docker compose down && docker compose up -d
```

## 📋 Database Schema

```sql
CREATE TABLE auction_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  block_number INTEGER NOT NULL,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  noun_id INTEGER NOT NULL,
  eth_price DOUBLE PRECISION NOT NULL,
  usd_price DOUBLE PRECISION NOT NULL,
  bidder_address TEXT NOT NULL,
  bidder_ens TEXT,
  winner_address TEXT,
  winner_ens TEXT,
  thumbnail_url TEXT,
  headline TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## 🎯 Key Features

### **Real-Time Processing Pipeline**
1. **Ponder Indexing** → Blockchain events detected and queued
2. **Worker Processing** → ENS resolution + ETH pricing + headline generation
3. **Database Storage** → Enriched data with conflict handling
4. **Pub/Sub Broadcasting** → Redis message published
5. **WebSocket Delivery** → Real-time frontend updates

### **Authentication & Security**
- **SIWE (EIP-4361)**: Sign-In with Ethereum standard
- **Session-based auth**: Secure WebSocket connections
- **Protected endpoints**: Authentication required for real-time feed

### **Production-Ready Features**
- **Pagination**: Browse thousands of historical events
- **Error Handling**: Graceful fallbacks and retry logic
- **Monitoring**: Health checks and metrics endpoints
- **Caching**: Redis-based ENS and price caching
- **Idempotency**: Conflict-free database inserts

## 🧪 Testing & Quality Assurance

### **Test Setup**
```bash
# Start Redis for cache tests
docker run -d --name redis-test -p 6379:6379 redis:7-alpine

# Start Anvil for blockchain tests (separate terminal)
anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY --fork-block-number 20500000
```

### **Running Tests -- Check test screenshots directory**
```bash
# Cache & ENS resolution tests
NODE_ENV=test pnpm jest packages/worker/src/jobs/__tests__/cache.test.ts

# Blockchain integration tests
pnpm jest packages/worker/src/jobs/__tests__/auctionCycle.test.ts

# All tests
pnpm jest packages/worker/src/jobs/__tests__/
```

### **Test Coverage**
- ✅ ETH price API integration with Redis caching
- ✅ ENS name resolution with mainnet fork
- ✅ Nouns auction contract interaction
- ✅ End-to-end auction cycle simulation
- ✅ Cache performance and TTL validation

## 🧪 Testing & Simulation

### **Simulate Auction Events**
```bash
# Generate single test event
docker compose exec worker tsx packages/worker/src/dockerTestWorker.ts

# Generate multiple events
for i in {1..5}; do
  docker compose exec worker tsx packages/worker/src/dockerTestWorker.ts
  sleep 1
done
```

### **System Health Verification**
```bash
# Check all services
curl http://localhost:4001/health
curl http://localhost:42069  # Ponder status

# Database connection
docker compose exec postgres pg_isready -U nounsuser

# Redis connection
docker compose exec redis redis-cli ping

# View processed events
curl http://localhost:4001/headlines?page=1&limit=5
```

## 🐛 Troubleshooting

### **Common Issues**

**Ponder won't start locally:**
```bash
# Clear Ponder cache
cd packages/indexer
rm -rf .ponder node_modules
npm install
npm run dev
```

**Docker services failing:**
```bash
# Check logs
docker compose logs [service-name]

# Restart specific service
docker compose restart [service-name]

# Nuclear option
docker compose down -v && docker compose up -d
```

**Redis connection issues:**
```bash
# Check Redis connectivity
docker compose exec redis redis-cli ping

# Monitor job queue
docker compose exec redis redis-cli KEYS "bull:*"
```

### **Debug Commands**
```bash
# Check running containers
docker compose ps

# Monitor specific logs
docker compose logs -f worker
tail -f packages/indexer/.ponder/ponder.log  # Ponder logs

# Database queries
docker compose exec postgres psql -U nounsuser -d nouns -c "SELECT COUNT(*) FROM auction_events WHERE usd_price IS NOT NULL;"

# Redis job monitoring
docker compose exec redis redis-cli MONITOR
```

## 🎨 Frontend Features

- **🔐 Ethereum Wallet Connection**: MetaMask integration with SIWE
- **⚡ Real-Time Feed**: Live auction updates via protected WebSocket
- **📄 Pagination**: Browse historical auction data (page 1, 2, 3...)
- **📊 Event Statistics**: Total events, active auctions, settled auctions
- **🎯 Rich Data Display**: ENS names, USD prices, blockchain timestamps
- **📱 Responsive Design**: Friendly interface
- **🛡️ Protected Access**: Authentication-gated real-time features

## 🔮 Tech Stack

**Blockchain Indexing:** Ponder, TypeScript  
**Frontend:** React, TypeScript, Vite, Tailwind CSS, ethers.js  
**Backend:** Node.js, Express, Socket.IO, TypeScript  
**Database:** PostgreSQL, Drizzle ORM  
**Queue & Cache:** Redis, BullMQ  
**Infrastructure:** Docker Compose (hybrid with local Ponder)  
**Authentication:** SIWE (Sign-In with Ethereum)

## 🚀 Production Deployment

### **Environment Configuration**
```bash
# Update for production
NODE_ENV=production
REDIS_URL=redis://production-redis:6379
DATABASE_URL=postgresql://user:pass@production-db:5432/nouns
ALCHEMY_MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/PRODUCTION_KEY
```

---

**Ready to track some Nouns auctions with hybrid blockchain indexing! 🎩⚡**