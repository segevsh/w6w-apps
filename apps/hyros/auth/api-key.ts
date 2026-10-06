import type { AuthDefinition } from "@w6w/types";
import { buildUrl } from "../lib/client.ts";

/**
 * Hyros API key — sent as the `API-Key` request header (not `Authorization`).
 *
 * Verified live against api.hyros.com on 2026-10-06:
 *  - no key        -> `401`, `text/plain`, body `Unauthorized` (not JSON)
 *  - a wrong key   -> `401`, JSON `{"result":"ERROR","message":["Api key not valid"]}`
 * The vendor's reference also documents the *same* "Api key not valid" message
 * under `400`, so credential validity is judged from the body message, with the
 * status only as a hint.
 */
export interface HyrosCredential {
  apiKey: string;
}

/**
 * Credential-liveness probe: `GET /stages?pageSize=1` — the cheapest authenticated
 * read, account-level (not resource-scoped), and it returns only stage names and
 * counts, never credential material. (`/user-info` would also work but returns the
 * account holder's profile, address and VAT number.)
 */
export const PROBE_PATH = "/stages";

const authDef: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API key from Hyros under Settings > API.",
  apiKey: { in: "header", name: "API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Hyros dashboard > Settings > API (the key is shown once; copy it exactly).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<HyrosCredential>;
    request.headers["api-key"] = (apiKey ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<HyrosCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${buildUrl(PROBE_PATH, { pageSize: 1 })}`, {
      headers: { accept: "application/json", "api-key": key },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    let messages: string[] = [];
    try {
      const j = JSON.parse(text) as { message?: unknown };
      if (Array.isArray(j.message)) messages = j.message.map(String);
    } catch {
      // Non-JSON body, e.g. the bare `Unauthorized` a missing key gets.
    }
    if (messages.some((m) => /api key not valid/i.test(m))) {
      return {
        ok: false,
        message: "Hyros rejected the API key. Copy it again from Settings > API.",
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Hyros refused the request (${res.status}). The key did not reach the request ` +
          "or has been revoked; reconnect this connection.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Hyros rate limit hit while testing the key; retry shortly." };
    }
    return {
      ok: false,
      message: `Hyros answered ${res.status}${messages.length ? `: ${messages.join("; ")}` : ""}`,
    };
  },
};

export default authDef;
