import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { ACCEPT, API_BASE, isAccessDenied } from "../lib/client.ts";

/**
 * MoonClerk API key — `Authorization: Token token=<key>`, applied in `sign`.
 *
 * Verified 2026-10-06 against `github.com/moonclerk/developer` `api/README.md`: "you pass it in
 * the Authorization header as an authorization token. `Authorization: Token token=[API Key]`".
 * The key is generated at https://app.moonclerk.com/settings/api-key and gives access to the
 * whole account's data, read only.
 *
 * ## Probe: `GET /forms?count=1`
 *
 * Returns at most one payment form (`id`, `title`, `access_token`, volume), never the API key,
 * and needs no scope. A missing or rejected key is **HTTP 401** with a `text/plain` body
 * `HTTP Token: Access denied.` (measured: no header and a bogus `Token token=bad` answer the
 * same bytes, with or without the versioned `Accept`). The body is not JSON and carries no
 * error code, so the verdict is the 2xx + `forms` array on one side and the `Access denied`
 * text on the other; any other status is reported as itself, never as a bad key.
 */
export interface MoonClerkCredential {
  apiKey: string;
}

export const PROBE_PATH = "/forms?count=1";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: ACCEPT },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A MoonClerk API key (Settings > API Key), sent as `Authorization: Token token=<key>`.",
  connectionLabel: "MoonClerk",
  apiKey: { in: "header", name: "Authorization", prefix: "Token token=" },
  fields: [
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "MoonClerk > Settings > API Key (https://app.moonclerk.com/settings/api-key). " +
        "It reads the whole account, so keep it private.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as Partial<MoonClerkCredential>;
    request.headers["authorization"] = `Token token=${(key ?? "").trim()}`;
    request.headers["accept"] = ACCEPT;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<MoonClerkCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    let res: Response;
    try {
      res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    } catch (e) {
      return { ok: false, message: `could not reach the MoonClerk API: ${e}` };
    }
    const raw = await res.text().catch(() => "");

    if (res.ok) {
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch { /* not JSON */ }
      return Array.isArray((body as { forms?: unknown } | undefined)?.forms)
        ? { ok: true }
        : { ok: false, message: `unexpected ${res.status} body from GET /forms — no forms list` };
    }
    if (isAccessDenied(raw)) {
      return {
        ok: false,
        message: "MoonClerk rejected the API key (HTTP Token: Access denied). Copy it again " +
          "from Settings > API Key.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "MoonClerk throttled the key check (429); try again" };
    }
    if (res.status >= 500) {
      return { ok: false, message: `MoonClerk is erroring (HTTP ${res.status})` };
    }
    return { ok: false, message: `MoonClerk answered HTTP ${res.status} for GET /forms` };
  },
};

export default apiKey;
