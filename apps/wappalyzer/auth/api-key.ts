import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, PATHS } from "../lib/client.ts";

/**
 * Wappalyzer API key — `x-api-key: <key>`.
 *
 * Verified against `components.securitySchemes.ApiKeyAuth` in Wappalyzer's own
 * OpenAPI 3.1 contract (fetched 2026-09-29) and against live probes on the
 * same day.
 *
 * ## Missing and invalid are the SAME response — confirmed live, not assumed
 *
 * Three requests to `GET /v2/lookup/` were compared byte-for-byte on
 * 2026-09-29: no `x-api-key` header at all, a syntactically-plausible-but-fake
 * key, and a bearer-style `Authorization` header instead of `x-api-key`. All
 * three answered the identical `403 {"message":"Forbidden"}`, 23 bytes, with
 * `x-amzn-errortype: ForbiddenException` — the signature of an AWS API
 * Gateway usage-plan key check rejecting the request before it reaches
 * Wappalyzer's own application code. The vendor's Basics page states the same
 * thing structurally: `403` is documented as one bucket — "Authorization
 * failure (incorrect API key, invalid method or resource or insufficient
 * credits)" — not three distinguishable cases. `test` below reports that
 * honestly instead of inventing a distinction the API does not make.
 */

export interface WappalyzerCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` cannot drift apart. */
export function authHeaders(credential: Partial<WappalyzerCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe: `GET /v2/credits/balance/`.
 *
 * Chosen over `GET /v2/lookup/` or any other documented endpoint because it
 * is the one call in this app's surface that:
 *
 *  - **Requires a credential** (confirmed 403 unauthenticated, live).
 *  - **Costs nothing.** The Basics page lists no "Pricing" row for it, unlike
 *    every other endpoint here, which is what makes it safe to run on a
 *    health-check cadence rather than spending the account's credits every
 *    time a connection is verified.
 *  - **Returns no credential material or account-identifying detail** — the
 *    response schema is exactly `{"credits": <integer>}`.
 */
export const PROBE_PATH = PATHS.creditsBalance;

interface CreditsBalanceBody {
  credits?: number;
}

interface WappalyzerErrorBody {
  message?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from your Wappalyzer account (Account > API). A Business plan or higher " +
    "is required for API access.",
  connectionLabel: "Wappalyzer",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From your Wappalyzer account settings, under API.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<WappalyzerCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<WappalyzerCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });

    if (res.ok) {
      const body = await res.json().catch(() => null) as CreditsBalanceBody | null;
      if (typeof body?.credits !== "number") {
        return {
          ok: false,
          message: "Wappalyzer accepted the key but the credit-balance response carried no " +
            "numeric credits field",
        };
      }
      return { ok: true };
    }

    const raw = await res.text().catch(() => "");
    let parsed: WappalyzerErrorBody | null = null;
    try {
      parsed = JSON.parse(raw) as WappalyzerErrorBody;
    } catch { /* not JSON */ }

    if (res.status === 403) {
      return {
        ok: false,
        message:
          `Wappalyzer rejected the request (403${parsed?.message ? ` ${parsed.message}` : ""}). ` +
          "This response is identical whether the API key is missing, incorrect, or the account " +
          "has run out of credits — Wappalyzer's own gateway does not distinguish those cases. " +
          "Check the key in your Wappalyzer account (Account > API) and your credit balance.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: "Wappalyzer rate-limited the credential check (429 — 10 requests/second). The " +
          "key itself may be fine; retry shortly.",
      };
    }
    return { ok: false, message: `Wappalyzer returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKey;
