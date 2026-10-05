import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * SamCart API key — sent in the `sc-api` request header.
 *
 * The OpenAPI document's only security scheme is `apiKeyAuth: {type: apiKey,
 * name: sc-api, in: header}`, and its prose says to "pass the header parameter
 * `sc-api` with your provided API key". Keys are created in the SamCart
 * dashboard under Settings > API Keys and need a plan that includes API access.
 * The reference also mentions OAuth for a "per-user cap", but gives no
 * authorization or token URL, so no `oauth2` method is declared.
 *
 * ## The probe is `GET /v1/products?limit=1`
 *
 * It reads the catalogue (no PII, and no field that carries the credential) and
 * needs nothing beyond API access. A rejected key is classified from the BODY,
 * not the status: the gateway answers `{"message": "Invalid authentication
 * credentials"}` or `{"message": "No API key found in request"}` (401, observed
 * unauthenticated 2026-10-05), a plan without API access answers 403 with a
 * `{"message"}`. Success is a body carrying a `data` array.
 */

export interface SamCartCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign`, `test` and `afterConnect`. */
export function authHeaders(credential: Partial<SamCartCredential>): Record<string, string> {
  return { "sc-api": credential.apiKey ?? "" };
}

export const PROBE_PATH = "/products";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Create a key in SamCart under Settings > API Keys. Creating one needs a plan " +
    "that includes API access.",
  connectionLabel: "SamCart",
  apiKey: { in: "header", name: "sc-api" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "SamCart dashboard > Settings > API Keys.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as SamCartCredential))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<SamCartCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const body = await res.json().catch(() => null) as
      | { data?: unknown; message?: string; error?: string }
      | null;

    if (res.ok && Array.isArray(body?.data)) return { ok: true };

    const detail = typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
      ? body.error
      : undefined;
    if (res.status === 403) {
      return {
        ok: false,
        message: `SamCart refused the request (403)${detail ? `: ${detail}` : ""}. The plan may ` +
          "not include API access, or the account is not active.",
      };
    }
    if (detail || res.status === 401) {
      return {
        ok: false,
        message: `SamCart rejected the key (${res.status})${detail ? `: ${detail}` : ""}. Check ` +
          "it was copied exactly from Settings > API Keys.",
      };
    }
    return { ok: false, message: `SamCart returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKey;
