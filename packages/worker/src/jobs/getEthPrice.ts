import redis from '../../../shared/lib/redis';

export async function getEthPrice(): Promise<number> {
  const cached = await redis.get('eth_price_usd');
  if (cached) return JSON.parse(cached).ethereum.usd;

  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  const data = await res.json();

  await redis.set('eth_price_usd', JSON.stringify(data), 'EX', 60); // cache for 1 minute
  return data.ethereum.usd;
}
