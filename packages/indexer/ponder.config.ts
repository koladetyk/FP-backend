// packages/indexer/ponder.config.ts
import { createConfig } from "ponder";
import AuctionHouseAbi from "./../../abis/AuctionHouse.json";

export default createConfig({
  chains: {
    mainnet: { 
      id: 1,
      rpc: "https://eth-mainnet.g.alchemy.com/v2/8z97SLNa6UgFuhUTR5net",
    },
  },
  contracts: {
    AuctionHouse: {
      abi: AuctionHouseAbi, // Import the ABI as JavaScript array
      chain: "mainnet",
      address: "0x830BD73E4184cef73443C15111a1DF14e495C706",
      startBlock: 12985438,
    },
  },
});