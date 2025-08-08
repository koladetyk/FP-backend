import React from "react";
import { signInWithEthereum } from "../utils/siwe";

const LoginButton = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithEthereum();
      console.log("Logged in:", result);
    } catch (err) {
      console.error("SIWE login failed", err);
    }
  };

  return (
    <button onClick={handleLogin} className="bg-black text-white px-4 py-2 rounded">
      Sign in with Ethereum
    </button>
  );
};

export default LoginButton;
