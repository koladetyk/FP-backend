import '../../../shared/lib/env'; // 👈 must be the first line!
import { JsonRpcProvider } from 'ethers';

const provider = new JsonRpcProvider(process.env.ALCHEMY_MAINNET_URL);
export { provider };
