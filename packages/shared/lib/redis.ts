// shared/lib/redis.ts
import IORedis from 'ioredis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔧 Loading environment from:', process.cwd() + '/.env');

// Smart Redis configuration that works in Docker and locally
const getRedisConfig = () => {
  const isTest = process.env.NODE_ENV === 'test';
  const isInDocker = process.env.DOCKER_ENV === 'true' || process.env.REDIS_URL?.includes('redis:6379');
  
  console.log('🔍 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    DOCKER_ENV: process.env.DOCKER_ENV,
    REDIS_URL: process.env.REDIS_URL ? '✅ Set' : '❌ Missing',
    REDIS_URL_VALUE: process.env.REDIS_URL,
    IS_IN_DOCKER: isInDocker
  });

  if (isTest) {
    // For tests, use localhost with shorter timeouts
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      connectTimeout: 2000,
      commandTimeout: 2000,
    };
  }

  // Parse REDIS_URL if provided, otherwise use defaults
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      lazyConnect: false,
    };
  }

  // Fallback configuration
  return {
    host: isInDocker ? 'redis' : 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    lazyConnect: false,
  };
};

const redisConfig = getRedisConfig();
console.log('🔗 Creating Redis connection with config:', redisConfig);

const redis = new IORedis(redisConfig);

redis.on('connect', () => {
  console.log('✅ Shared Redis connected');
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV === 'test') {
    console.warn('⚠️ Redis not available in tests:', err.message);
  } else {
    console.error('❌ Shared Redis error:', err.message);
  }
});

export default redis;