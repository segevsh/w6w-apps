import type { HookContext } from "@w6w/types";

/**
 * The Netlify REST API v1 base. Verified against
 * https://docs.netlify.com/api/get-started/ and the official OpenAPI spec
 * (https://open-api.netlify.com/swagger.json), 2026-08-01.
 */
export const API_BASE = "https://api.netlify.com/api/v1";

/**
 * Netlify's documented error body shape (the OpenAPI spec's `default`
 * response): `{ code, message }`. Unlike Cloudflare, there is no envelope
 * around success responses — a 2xx body is the resource itself (an object or
 * an array), so only the error path needs unwrapping.
 */
export interface NetlifyApiError {
  code?: number;
  message?: string;
}

function formatError(status: number, body: NetlifyApiError | undefined): string {
  if (body?.message) return `${status}: ${body.message}`;
  return `HTTP ${status}`;
}

/**
 * Call the Netlify REST API and return the parsed JSON body, throwing a
 * descriptive `Error` on a non-2xx response. `path` is relative to
 * {@link API_BASE} (e.g. `/sites`).
 */
export async function netlifyFetch<T>(
  ctx: HookContext,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await ctx.fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => undefined) as NetlifyApiError | undefined;
    throw new Error(`Netlify API ${path} returned ${formatError(res.status, body)}`);
  }
  // Some endpoints (e.g. cancel) return 200 with an empty or non-JSON body.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
