// packages/worker/src/jobs/resolveEns.ts
import { ethers } from "ethers";
import redis from '../../../shared/lib/redis';

// Smart provider configuration for different environments
const getRpcUrl = () => {
  // In tests, use Anvil (IPv4 explicit to avoid IPv6 issues)
  if (process.env.NODE_ENV === 'test') {
    return 'http://127.0.0.1:8545';
  }
  
  // In production/development, use configured RPC URL from environment
  return process.env.RPC_URL || process.env.ALCHEMY_MAINNET_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY';
};

// Create provider with environment-aware URL
const provider = new ethers.JsonRpcProvider(getRpcUrl());

export async function resolveENS(address: string | undefined): Promise<string | null> {
  if (!address) return null;
  
  // Validate address format first
  if (!ethers.isAddress(address)) {
    console.log(`⚠️ Invalid address format: ${address}`);
    return null;
  }
  
  const key = `ens:${address.toLowerCase()}`;
  
  try {
    // Check cache first
    const cached = await redis.get(key);
    if (cached !== null) {
      return cached === '' ? null : cached;
    }
    
    // Try to resolve ENS
    const ens = await provider.lookupAddress(address);
    
    // Cache the result (empty string for null values)
    await redis.set(key, ens ?? '', 'EX', 3600);
    
    console.log(`🏷️ ENS resolved: ${address} -> ${ens || 'null'}`);
    return ens;
    
  } catch (error) {
    // Fix TypeScript error by properly typing the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // More detailed error logging for debugging
    if (process.env.NODE_ENV === 'test') {
      console.warn(`⚠️ ENS resolution failed for ${address} (using ${getRpcUrl()}):`, errorMessage);
    } else {
      console.error(`❌ ENS resolution failed for ${address}:`, error);
    }
    
    // Cache null result to avoid repeated failures
    await redis.set(key, '', 'EX', 300); // Shorter cache for failures
    return null;
  }
}