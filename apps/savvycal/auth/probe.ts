import type { HookContext } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * The credential-liveness probe: `GET /v1/me`.
 *
 * Chosen by reading the response body, not the name: `/me` returns the caller's
 * profile (id, name, email, time zone, plan) and never the token, so unlike
 * some vendors' whoami it is safe to store. It needs no scope, and it is the
 * only unscoped read in the API.
 *
 * Classified from the BODY. A bad or missing credential answers `401` with the
 * bare `text/plain` body `Unauthenticated` (15 bytes, measured 2026-10-06); a
 * good one answers JSON carrying a string `id`. A `200` that is not that shape
 * (a proxy's HTML page, say) is not a pass.
 */
export const PROBE_URL = `${API_BASE}${API_PREFIX}/me`;

export interface Me {
  id?: string;
  email?: string;
  display_name?: string;
  plan?: string;
}

export function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export async function probe(
  ctx: HookContext,
  token: string,
): Promise<{ ok: true; me: Me } | { ok: false; message: string }> {
  const res = await ctx.fetch(PROBE_URL, {
    headers: { accept: "application/json", ...bearer(token) },
  });
  const text = await res.text().catch(() => "");
  let body: Me | null = null;
  try {
    body = JSON.parse(text) as Me;
  } catch { /* plain text */ }

  if (res.ok && body && typeof body.id === "string") return { ok: true, me: body };
  if (res.status === 401 || /unauthenticated/i.test(text)) {
    return {
      ok: false,
      message: "SavvyCal rejected the credential (Unauthenticated). Check the token was copied " +
        "exactly and has not been revoked in Settings > Developers, or reconnect.",
    };
  }
  if (res.ok) {
    return { ok: false, message: `SavvyCal answered ${res.status} with an unexpected body` };
  }
  return { ok: false, message: `SavvyCal returned HTTP ${res.status} for /v1/me` };
}
