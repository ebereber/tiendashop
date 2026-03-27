import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Tiendanube webhook signature using CLIENT_SECRET.
 * Tiendanube signs webhooks with the app's client secret, not a separate webhook secret.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET;

  if (!clientSecret) {
    console.error("[Webhook][SIG] missing TIENDANUBE_CLIENT_SECRET");
    return false;
  }

  if (!signature) {
    return false;
  }

  try {
    const expectedSignature = createHmac("sha256", clientSecret)
      .update(payload, "utf8")
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
