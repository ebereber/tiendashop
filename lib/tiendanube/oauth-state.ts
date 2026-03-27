import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_MAX_AGE_MS = 15 * 60 * 1000;

interface TiendanubeOAuthStatePayload {
  userId: string;
  iat: number;
}

export type ParsedOAuthState =
  | { valid: true; userId: string }
  | { valid: false; error: string };

function getStateSecret(): string | null {
  return process.env.TIENDANUBE_STATE_SECRET ?? process.env.TIENDANUBE_CLIENT_SECRET ?? null;
}

function signStatePayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSignedOAuthState(userId: string): string {
  const secret = getStateSecret();
  if (!secret) {
    throw new Error("Missing state secret");
  }

  const payload: TiendanubeOAuthStatePayload = {
    userId,
    iat: Date.now(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signStatePayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function parseSignedOAuthState(state: string): ParsedOAuthState {
  const secret = getStateSecret();
  if (!secret) {
    return { valid: false, error: "Missing state secret" };
  }

  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    return { valid: false, error: "Malformed state" };
  }

  const expectedSignature = signStatePayload(encodedPayload, secret);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { valid: false, error: "Invalid state signature" };
  }

  let payload: TiendanubeOAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
  } catch {
    return { valid: false, error: "Invalid state payload" };
  }

  if (!payload.userId || typeof payload.userId !== "string") {
    return { valid: false, error: "Missing userId in state" };
  }

  if (!payload.iat || Date.now() - payload.iat > STATE_MAX_AGE_MS) {
    return { valid: false, error: "Expired state" };
  }

  return { valid: true, userId: payload.userId };
}
