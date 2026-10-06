import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * QuickChart API key — optional.
 *
 * QuickChart answers anonymously (a shared free tier), so this credential only buys higher rate
 * limits, bigger `data.labels` arrays and 6-month short URLs. Every action sets
 * `requiresAuth: false`, so it runs with no connection at all; when a connection exists, `sign`
 * adds the key.
 *
 * ## Header, never the `key` field
 *
 * The vendor accepts the key as a `key` query/body field or as `Authorization: Bearer <key>` and
 * says to "prefer the Authorization header for new integrations" (OpenAPI `apiKey` field). A `key`
 * in a body is also echoed into the URL that `/qr-url` returns, which would publish the key.
 *
 * ## A wrong key is NOT an error
 *
 * Measured 2026-10-06: `Authorization: Bearer bogus` and `?key=bogus` both answer 200 and are
 * silently treated as an anonymous caller (`normalized.authenticated: false`). So `test` cannot
 * look at the status; it renders a validation request and requires `authenticated: true`.
 */
export interface QuickChartCredential {
  apiKey?: string;
}

/** The one place the wire format is built — shared by `sign` and the probe in `test`. */
export function authHeaders(key: string | undefined): Record<string, string> {
  const trimmed = (key ?? "").trim();
  return trimmed ? { authorization: `Bearer ${trimmed}` } : {};
}

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}/api/validate-chart`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chart: { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } },
      width: 50,
      height: 50,
    }),
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key (optional)",
  description: "A QuickChart API key from quickchart.io/account. Optional — QuickChart works " +
    "without one on a shared free rate limit.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: false,
      hint: "Leave empty to use QuickChart anonymously.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as QuickChartCredential;
    Object.assign(request.headers, authHeaders(apiKey));
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as QuickChartCredential;
    if (!(apiKey ?? "").trim()) {
      return { ok: true, message: "No API key set — QuickChart will be used anonymously." };
    }
    const request = await apiKey_sign({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body as string,
    });
    if (res.status === 429) {
      return { ok: false, message: "QuickChart rate-limited the key check (429); try again" };
    }
    if (res.status === 403) {
      return { ok: false, message: "QuickChart rejected the API key (403)." };
    }
    const body = await res.json().catch(() => null) as
      | { normalized?: { authenticated?: boolean } }
      | null;
    if (!res.ok || !body) {
      return { ok: false, message: `QuickChart answered HTTP ${res.status} to the key check` };
    }
    if (body.normalized?.authenticated === true) return { ok: true };
    return {
      ok: false,
      message: "QuickChart did not recognise this API key — it treats an unknown key as an " +
        "anonymous caller instead of rejecting it. Check it was copied exactly from " +
        "quickchart.io/account.",
    };
  },
};

// `sign` is declared optional on AuthDefinition; this is the non-null handle used by `test`.
const apiKey_sign = apiKey.sign!;

export default apiKey;
