import { createPublicClient, http, createWalletClient, parseEther, getAddress } from 'viem';
import { mainnet } from 'viem/chains';
import auctionHouseAbi from '../../../../../abis/AuctionHouse.json';

const AUCTION_HOUSE = getAddress('0x830BD73E4184cef73443C15111a1DF14e495C706');

const FORK_RPC = 'http://127.0.0.1:8545';
const WHALE = getAddress('0x7e2cE5fFD29f7A5B3aD7D8ED3c1C7eE37D56c6d7'); // ETH-rich

describe('Mainnet fork – Nouns auction cycle', () => {
  let publicClient: any;
  let walletClient: any;

  beforeAll(async () => {
    //publicClient = createPublicClient({ chain: mainnet, transport: http(FORK_RPC) });
    publicClient = createPublicClient({
        chain: mainnet,
        transport: http('http://127.0.0.1:8545') // ← manually override here
      })
    walletClient = createWalletClient({ chain: mainnet, transport: http(FORK_RPC) });

    // Impersonate ETH whale
    await publicClient.request({ method: 'anvil_impersonateAccount', params: [WHALE] });
    await publicClient.request({
      method: 'anvil_setBalance',
      params: [WHALE, '0x1000000000000000000'] // 1 ETH
    });
  });

  it('bids, settles, and starts next auction', async () => {
    const nounId = await publicClient.readContract({
      address: AUCTION_HOUSE,
      abi: auctionHouseAbi,
      functionName: 'auction',
    }).then((auction: any) => auction.nounId);

    const txHash = await walletClient.writeContract({
      account: WHALE,
      address: AUCTION_HOUSE,
      abi: auctionHouseAbi,
      functionName: 'createBid',
      args: [nounId],
      value: parseEther('1'),
    });

    expect(txHash).toBeTruthy();

    // Fast forward 1 day
    await publicClient.request({ method: 'evm_increaseTime', params: [86400] });
    await publicClient.request({ method: 'evm_mine' });

    const settleTx = await walletClient.writeContract({
      account: WHALE,
      address: AUCTION_HOUSE,
      abi: auctionHouseAbi,
      functionName: 'settleCurrentAndCreateNewAuction',
    });

    expect(settleTx).toBeTruthy();
  });
});
