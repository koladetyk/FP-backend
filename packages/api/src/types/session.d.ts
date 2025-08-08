// packages/api/src/types/session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    nonce?: string;
    siwe?: {
      address: string;
      chainId: number;
      domain: string;
      uri: string;
      version: string;
      statement?: string;
      nonce: string;
      issuedAt?: string;
      expirationTime?: string;
      notBefore?: string;
      requestId?: string;
      resources?: string[];
    };
  }
}