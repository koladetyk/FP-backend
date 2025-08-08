// packages/frontend/src/utils/siwe.ts
import { ethers } from "ethers";
import { SiweMessage } from "siwe";

export async function signInWithEthereum() {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error("No Ethereum provider found");

  // Request account access
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const rawAddress = accounts[0];

  // Get address in checksum format - use ethers v5 OR v6 syntax
  let address: string;
  try {
    // Try ethers v6 first
    address = ethers.getAddress(rawAddress);
  } catch {
    // Fallback to ethers v5
    address = (ethers as any).utils.getAddress(rawAddress);
  }

  // Get chain ID
  const chainId = await provider.request({ method: "eth_chainId" });
  
  // Get nonce from backend
  const nonceRes = await fetch("/api/nonce", {
    credentials: 'include' // Important for session cookies
  });
  
  if (!nonceRes.ok) {
    throw new Error("Failed to get nonce");
  }
  
  const { nonce } = await nonceRes.json();
  
  console.log("Nonce:", nonce);
  console.log("Address:", address);
  console.log("ChainId:", parseInt(chainId, 16));

  // Create SIWE message
  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: "Sign in with Ethereum to the app.",
    uri: window.location.origin,
    version: "1",
    chainId: parseInt(chainId, 16),
    nonce: nonce.trim(), // Ensure no whitespace
  });

  const preparedMessage = message.prepareMessage();
  console.log("Prepared Message:\n", preparedMessage);
  console.log("Message length:", preparedMessage.length);
  console.log("Message lines:", preparedMessage.split('\n').length);

  // Create signer - handle both ethers v5 and v6
  let signer: any;
  try {
    // Try ethers v6
    const browserProvider = new ethers.BrowserProvider(provider);
    signer = await browserProvider.getSigner();
  } catch {
    // Fallback to ethers v5
    const web3Provider = new (ethers as any).providers.Web3Provider(provider);
    signer = web3Provider.getSigner();
  }

  // Sign the message
  const signature = await signer.signMessage(preparedMessage);

  // Send to backend
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include', // Important for session cookies
    body: JSON.stringify({ 
      message: preparedMessage, 
      signature 
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Login failed: ${error}`);
  }

  return await res.json();
}