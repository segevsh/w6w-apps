import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, bareCode, CODE_MEANINGS } from "../lib/client.ts";

/**
 * seven API key — `X-Api-Key: <key>`.
 *
 * Verified 2026-10-06 against docs.seven.io/en/rest-api/authentication. The docs also allow
 * `Authorization: Basic <key>` (the key itself, no base64), an OAuth2 bearer token, and the
 * deprecated `p=` query parameter / login password; this app takes the API key header and never
 * puts the key in a URL. Create a key under Developer > API keys in the seven dashboard.
 *
 * The probe is `GET /balance` with `Accept: application/json`: the answer is
 * `{"amount": 12.35, "currency": "EUR"}` — no key material. Every outcome is HTTP 200, so the
 * verdict is read from the body: an object with a numeric `amount` is a live key, a bare `900`
 * is a refused one (`"900"` was measured for a junk key and for no key at all).
 *
 * `902` (the key lacks the `balance` scope) is a recognised, working key, so the connection is
 * accepted; actions the key's scopes do not cover will fail with 902 when called.
 */
export interface SevenCredential {
  apiKey: string;
}

export const PROBE_PATH = "/balance";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an API key from the seven dashboard (Developer > API).",
  apiKey: { in: "header", name: "X-Api-Key" },
  connectionLabel: "seven",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "dashboard.seven.io > Developer > API. If the key has an IP allow-list or " +
        "requires request signing, calls from elsewhere fail with codes 903 / 901.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<SevenCredential>;
    request.headers["x-api-key"] = apiKey ?? "";
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<SevenCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", "x-api-key": key },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }

    // The documented success shape — not merely a 2xx.
    if (
      res.ok && body && typeof body === "object" && !Array.isArray(body) &&
      typeof (body as { amount?: unknown }).amount === "number"
    ) {
      return { ok: true };
    }

    const code = bareCode(body);
    if (code === "902") return { ok: true };
    if (code) {
      return {
        ok: false,
        message: `seven refused the API key: code ${code} — ${
          CODE_MEANINGS[code] ?? "unrecognised return code"
        }`,
      };
    }
    if (!res.ok) {
      return { ok: false, message: `seven returned HTTP ${res.status} for ${PROBE_PATH}` };
    }
    return { ok: false, message: "seven answered without a balance object or a return code" };
  },
};

export default apiKey;
