import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Skyvern API key — `x-api-key: <key>`.
 *
 * `components.securitySchemes.ApiKeyAuth` in Skyvern's OpenAPI document: `type: apiKey`,
 * `in: header`, `name: x-api-key`, "Your Skyvern API key from https://app.skyvern.com/settings".
 * Live on 2026-10-06, an authenticated route answers HTTP 403 either way:
 *   - no key:    `{"detail":"Invalid credentials"}`
 *   - wrong key: `{"detail":"Could not validate credentials"}`
 */

export interface SkyvernCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<SkyvernCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe: `GET /v1/browser_profiles?page_size=1`.
 *
 * It needs a key (403 without one) and answers a bare JSON array of the account's browser
 * profiles — names and ids, never the key. `/v1/version` is NOT usable for this: it answers 200
 * to anyone.
 */
export const PROBE_PATH = "/v1/browser_profiles";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an API key from the Skyvern app (Settings).",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From https://app.skyvern.com/settings.",
    },
  ],

  /** The only hook handed the raw credential; network-less — stamps the header and returns. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<SkyvernCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH}. Classified by the response BODY, never by status alone. */
  async test({ credential }, ctx) {
    const key = ((credential as Partial<SkyvernCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?page_size=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }

    if (res.ok && Array.isArray(body)) return { ok: true };

    const detail = (body as { detail?: unknown } | undefined)?.detail;
    const message = typeof detail === "string" ? detail : undefined;
    if (message === "Invalid credentials") {
      return {
        ok: false,
        message: "Skyvern received no credential. The API key did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (message === "Could not validate credentials") {
      return {
        ok: false,
        message: "Skyvern rejected the API key. Check it was copied exactly and has not been " +
          "deleted in Settings.",
      };
    }
    if (res.ok) {
      return { ok: false, message: "Skyvern answered with an unexpected body for the key check" };
    }
    return {
      ok: false,
      message: `Skyvern returned HTTP ${res.status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default apiKey;
