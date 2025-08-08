// packages/frontend/src/utils/ethersCheck.ts
import { ethers } from "ethers";

export function checkEthersVersion() {
  console.log("Ethers version info:", {
    hasUtils: !!(ethers as any).utils,
    hasGetAddress: !!(ethers as any).getAddress,
    hasBrowserProvider: !!(ethers as any).BrowserProvider,
    hasWeb3Provider: !!(ethers as any).providers?.Web3Provider,
    version: (ethers as any).version || "unknown"
  });
}

// Call this in your main component to debug
checkEthersVersion();