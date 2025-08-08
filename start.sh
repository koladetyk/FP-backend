#!/bin/bash

# start.sh - Single command to bring up Nouns Auction Tracker

echo "🎩 Starting Nouns Auction Tracker - Full Stack"
echo "=============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Creating .env file from template..."
    cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://nounsuser:password123@postgres:5432/nouns

# Redis Configuration
REDIS_URL=redis://redis:6379

# Ethereum RPC Configuration
ALCHEMY_MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY_HERE
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY_HERE

# Session Configuration
SESSION_SECRET=zkT!jD#E9dollarLr82p6F@q1gQhVZ

# Development Configuration
NODE_ENV=development
EOL
    echo "📝 Please update .env with your Alchemy API key, then run again"
    echo "💡 Get a free API key at: https://www.alchemy.com/"
    exit 1
fi

# Check if API key is still placeholder
if grep -q "YOUR_API_KEY_HERE" .env; then
    echo "⚠️  Please update your .env file with a real Alchemy API key"
    echo "💡 Get a free API key at: https://www.alchemy.com/"
    echo "📝 Replace YOUR_API_KEY_HERE in .env with your actual key"
    exit 1
fi

# Stop any existing containers
echo "🔄 Stopping existing containers..."
docker compose down

# Build and start all services
echo "🔨 Building and starting services..."
docker compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service health
echo "🔍 Checking service health..."

# Wait for postgres
echo "   📊 Waiting for PostgreSQL..."
until docker compose exec postgres pg_isready -U nounsuser > /dev/null 2>&1; do
    sleep 2
done

# Wait for redis
echo "   🔴 Waiting for Redis..."
until docker compose exec redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done

# Wait for API server
echo "   🌐 Waiting for API server..."
until curl -s http://localhost:4001/health > /dev/null 2>&1; do
    sleep 2
done

echo ""
echo "✅ Nouns Auction Tracker is ready!"
echo "=================================="
echo ""
echo "🌐 Services Available:"
echo "   Frontend:         http://localhost:5173"
echo "   API & WebSocket:  http://localhost:4001"
echo "   Redis Commander:  http://localhost:8082"
echo "   Ponder Indexer:   Running locally"
echo "                     cd packages/indexer then npm run dev"
echo ""
echo "📊 Database Access:"
echo "   Host: localhost:5433"
echo "   User: nounsuser"
echo "   Pass: password123"
echo "   DB:   nouns"
echo ""
echo "🧪 Quick Test Commands:"
echo "   Generate test event: docker compose exec worker tsx packages/worker/src/dockerTestWorker.ts"
echo "   View API health:     curl http://localhost:4001/health"
echo "   Check headlines:     curl http://localhost:4001/headlines"
echo ""
echo "🔧 Management Commands:"
echo "   Stop everything:     docker compose down -v"
echo "   View logs:           docker compose logs -f [service]"
echo "   Restart service:     docker compose restart [service]"
echo ""
echo "🧪 Run Tests:"
echo "   Cache tests:         NODE_ENV=test pnpm jest packages/worker/src/jobs/__tests__/cache.test.ts"
echo "   Auction tests:       pnpm jest packages/worker/src/jobs/__tests__/auctionCycle.test.ts"
echo "   (Note: Requires Redis running and Anvil for blockchain tests)"
echo ""
echo "🎩 Ready to track some Nouns auctions! ⚡"