import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Firecrawl API key — `Authorization: Bearer <key>`.
 *
 * Verified against the OpenAPI document's `components.securitySchemes`
 * (`bearerAuth: { type: "http", scheme: "bearer" }`) and live probes against
 * `api.firecrawl.dev` on 2026-09-15.
 *
 * ## Two endpoints work with NO credential at all
 *
 * `POST /scrape` and `POST /search` both answer successfully with zero
 * `Authorization` header — a "keyless free tier", rate-limited and missing
 * most endpoints (measured live: `/map`, `/crawl`, `/extract` and
 * `/batch/scrape` all reject the same unauthenticated request with a 401
 * naming the keyless tier explicitly). That means a successful `scrape` or
 * `search` call proves nothing about whether a key is attached or valid —
 * which is exactly why the probe below is a dedicated, credential-only
 * endpoint rather than "try an action and see if it works".
 *
 * ## The probe is `GET /team/credit-usage`
 *
 * Chosen by testing all three cases live on 2026-09-15, not by name:
 *
 * - **No `Authorization` header at all** → `401` with
 *   `"This endpoint is not supported by the keyless free tier. Sign up for a
 *   free API key at https://www.firecrawl.dev/signin …"` — this endpoint is
 *   not part of the keyless surface, so it reliably distinguishes "no
 *   credential reached the request" from a real attempt.
 * - **A syntactically plausible but wrong key** → `401` with
 *   `{"success": false, "error": "Unauthorized: Invalid token"}`.
 * - **A working key** → `200` with `{"success": true, "data":
 *   {"remainingCredits", "planCredits", "billingPeriodStart",
 *   "billingPeriodEnd"}}` — plan numbers, nothing else. It carries no team
 *   name, workspace id or anything else that would double as a
 *   `connectionLabel`, so there is no `afterConnect` here.
 *
 * Both failure cases are HTTP 401, so this app never classifies validity by
 * status code alone — it reads which of the two error strings came back.
 */

export interface FirecrawlCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` share it. */
export function authHeaders(credential: Partial<FirecrawlCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

export const PROBE_PATH = "/team/credit-usage";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from the Firecrawl dashboard (Settings > API Keys). Keys start with `fc-`.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "fc-...",
      hint: "Firecrawl dashboard > Settings > API Keys.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<FirecrawlCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module doc for why `/team/credit-usage` and not a `scrape`/`search` call. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<FirecrawlCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const body = await res.json().catch(() => null) as { error?: string } | null;

    if (res.ok) return { ok: true };

    if (/keyless free tier/i.test(body?.error ?? "")) {
      return {
        ok: false,
        message:
          "Firecrawl received no key. The credential did not reach the request — reconnect this " +
          "connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Firecrawl rejected the key: ${body?.error ?? "Unauthorized"}. Check it was ` +
          "copied exactly from the dashboard and has not been revoked.",
      };
    }
    return {
      ok: false,
      message: `Firecrawl returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.error ? `: ${body.error}` : ""
      }`,
    };
  },
};

export default apiKey;
