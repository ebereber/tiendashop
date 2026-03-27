/**
 * Allowed image hosts for next/image optimization.
 * Must match the remotePatterns in next.config.mjs
 */
export const ALLOWED_IMAGE_HOSTS = [
  "mitiendanube.com", // Tiendanube CDN (matches *.mitiendanube.com)
] as const;

/**
 * Check if an image URL is from an allowed host.
 * Returns true if the URL can be safely used with next/image.
 */
export function isAllowedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return ALLOWED_IMAGE_HOSTS.some((allowed) => {
      // Match exact domain or subdomains (e.g., cdn.mitiendanube.com)
      return hostname === allowed || hostname.endsWith(`.${allowed}`);
    });
  } catch {
    return false;
  }
}
