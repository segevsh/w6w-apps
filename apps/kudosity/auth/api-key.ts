import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatError } from "../lib/client.ts";

/**
 * Kudosity API key, sent as the `x-api-key` header (Transmit Message API v2).
 *
 * ## The probe
 *
 * `GET /v2/webhook` — the account's webhook list. It needs the key, spends nothing, is not tied to
 * a channel (an account with only SMS can still list webhooks) and its body is
 * `{"webhooks": [...]}`, which never contains the key. Measured 2026-10-06 on the live host:
 * a request with no key answers `401 {"status":"Invalid api key"}` and one with a wrong key answers
 * `401 {"status":"Unauthorized"}`; both are the gateway's own shape, so the verdict is the
 * documented `webhooks` array, never the status alone.
 *
 * Kudosity also publishes a legacy Transmit SMS v1 API (HTTP Basic, key plus secret). It is a
 * different credential and is not covered by this app.
 */
export interface KudosityCredential {
  apiKey: string;
}

export const PROBE_PATH = "/webhook";

export function authHeaders(credential: Partial<KudosityCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Kudosity API key (Kudosity dashboard > Settings > API Settings), sent as the " +
    "`x-api-key` header on the Transmit Message API v2.",
  connectionLabel: "Kudosity",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Kudosity dashboard > Settings > API Settings. This is the v2 key, not the legacy " +
        "v1 key and secret pair.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it only stamps the header. */
  sign({ request, credential }) {
    const cred = credential as Partial<KudosityCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<KudosityCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const body = await res.json().catch(() => null) as
      | { webhooks?: unknown; status?: unknown }
      | null;

    if (res.ok && Array.isArray(body?.webhooks)) return { ok: true };
    if (res.ok) {
      return { ok: false, message: "Kudosity answered 2xx with an unexpected body shape" };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Kudosity rejected the API key (${formatError(res.status, body)}). Check it ` +
          "was copied exactly from Settings > API Settings and is a v2 key.",
      };
    }
    return { ok: false, message: `Kudosity returned ${formatError(res.status, body)}` };
  },
};

export default apiKey;
