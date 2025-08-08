import redis from '../../../../shared/lib/redis';
import { getEthPrice } from '../getEthPrice';
import { resolveENS } from '../resolveEns';
import dotenv from 'dotenv';

dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

describe('Redis Cache Tests', () => {
  let redisAvailable = false;

  beforeAll(async () => {
    // Check if Redis is available before running tests
    try {
      await redis.ping();
      redisAvailable = true;
      console.log('✅ Redis is available for testing');
    } catch (error) {
      console.log('⚠️ Redis not available, will test functions without caching');
      redisAvailable = false;
    }
  });

  afterAll(async () => {
    // Don't disconnect if using shared Redis from Docker Compose
    // The Redis connection can stay open for other services
    if (redisAvailable && process.env.NODE_ENV === 'test') {
      try {
        // Just end the connection gracefully without forcing disconnect
        redis.disconnect(false);
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  });

  it('caches ETH price', async () => {
    if (!redisAvailable) {
      console.log('⏭️ Skipping Redis cache test - testing function directly');
      // Still test that the function works
      const price = await getEthPrice();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      return;
    }

    // Clear any existing cache
    await redis.del('eth_price_usd');
    
    // First call should fetch from API
    const first = await getEthPrice();
    expect(typeof first).toBe('number');
    expect(first).toBeGreaterThan(0);
    
    // Second call should use cache
    const second = await getEthPrice();
    expect(first).toBe(second); // second should be from cache
    
    console.log('✅ ETH price caching works:', first);
  }, 30000);

  it('caches ENS resolution', async () => {
    if (!redisAvailable) {
      console.log('⏭️ Skipping Redis cache test - testing function directly');
      // Still test that the function works
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const result = await resolveENS(address);
      expect(result).toBeDefined();
      return;
    }

    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik's address
    const cacheKey = `ens:${address.toLowerCase()}`;
    
    // Clear any existing cache
    await redis.del(cacheKey);
    
    // First call
    const first = await resolveENS(address);
    
    // Second call should use cache
    const second = await resolveENS(address);
    expect(first).toBe(second); // second should be from cache
    
    console.log('✅ ENS caching works:', first);
  }, 15000);

  it('checks TTL after caching ETH price', async () => {
    if (!redisAvailable) {
      console.log('⏭️ Skipping TTL test - Redis not available');
      return;
    }

    await redis.del('eth_price_usd');
    await getEthPrice();
    
    const ttl = await redis.ttl('eth_price_usd');
    expect(ttl).toBeGreaterThan(0);
    
    console.log('✅ Cache TTL is set:', ttl, 'seconds');
  }, 20000);

  it('measures cache performance', async () => {
    if (!redisAvailable) {
      console.log('⏭️ Skipping performance test - Redis not available');
      
      // Still test basic function performance
      const start = Date.now();
      const price = await getEthPrice();
      const duration = Date.now() - start;
      
      console.log(`Function call took: ${duration}ms`);
      expect(typeof price).toBe('number');
      return;
    }

    // Clear cache to force API call
    await redis.del('eth_price_usd');
    
    // Measure API fetch time
    const t0 = Date.now();
    const price1 = await getEthPrice(); // slow (API fetch)
    const t1 = Date.now();
    
    // Measure cache hit time
    const t2 = Date.now();
    const price2 = await getEthPrice(); // fast (Redis)
    const t3 = Date.now();
    
    const apiTime = t1 - t0;
    const cacheTime = t3 - t2;
    
    console.log(`API fetch: ${apiTime}ms`);
    console.log(`Cache hit: ${cacheTime}ms`);
    
    expect(price1).toBe(price2);
    // Cache should be significantly faster (allow some variance)
    expect(cacheTime).toBeLessThan(apiTime * 0.8);
  }, 30000);
});