import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, isErrorEnvelope } from "../lib/client.ts";

/**
 * WakaTime secret API key — HTTP Basic, applied in `sign`.
 *
 * Verified 2026-10-06 against `wakatime.com/developers#authentication` ("Using API Key"): "Using
 * HTTP Basic Auth pass your API Key base64 encoded in the Authorization header ... prepend
 * `Basic`". The key is the whole credential, base64-encoded as-is (no `user:` prefix, no
 * trailing colon): `Authorization: Basic base64(<key>)`. The alternative `?api_key=` query form
 * is NOT used: a key in a URL lands in logs.
 *
 * OAuth 2.0 (authorize/token/refresh at `wakatime.com/oauth/*`) also exists and the reference
 * recommends it for apps acting for other users. It is not modelled: the flow needs a
 * registered client and a per-user consent, and a single account's workflow automation is what
 * the API key is for. Add it as a second auth method when a multi-user need appears.
 *
 * ## Probe: `GET /users/current`
 *
 * Returns the owner's profile (`id`, `username`, `display_name`, `email`...). It does not echo
 * the key. A bad key, a missing key and a malformed key all answer HTTP 401
 * `{"errors": ["Unauthorized."]}` — indistinguishable by design — so the verdict is read from
 * the body: success needs a `data.id`, and the `errors` envelope is a rejection.
 */
export interface WakaCredential {
  apiKey: string;
}

export const PROBE_PATH = "/users/current";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Your WakaTime secret API key (wakatime.com/settings/api-key), sent as HTTP Basic.",
  connectionLabel: "WakaTime ({{user}})",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiKey",
      label: "Secret API key",
      type: "secret",
      required: true,
      hint: "wakatime.com > Settings > Account > API Key. Starts with `waka_`. Keep it private.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as Partial<WakaCredential>;
    request.headers["authorization"] = `Basic ${btoa((key ?? "").trim())}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<WakaCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    let res: Response;
    try {
      res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    } catch (e) {
      return { ok: false, message: `could not reach the WakaTime API: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }

    if (res.ok) {
      const id = (body as { data?: { id?: unknown } } | undefined)?.data?.id;
      return typeof id === "string" && id !== "" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /users/current — no user in it`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: "WakaTime rejected the API key (Unauthorized). Copy it from " +
          "wakatime.com/settings/api-key.",
      };
    }
    if (res.status === 429 || res.status === 302) {
      return { ok: false, message: `WakaTime rate-limited the key check (HTTP ${res.status})` };
    }
    if (res.status >= 500) {
      return { ok: false, message: `WakaTime is erroring (HTTP ${res.status})` };
    }
    return {
      ok: false,
      message: `WakaTime answered HTTP ${res.status}${
        isErrorEnvelope(body) ? ` (${JSON.stringify((body as { errors: unknown }).errors)})` : ""
      } for ${PROBE_PATH}`,
    };
  },

  /** Records the account's username for the connection label. */
  async afterConnect({ credential }, ctx) {
    let user = "WakaTime";
    try {
      const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
      const res = await ctx.fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
      if (res.ok) {
        const body = await res.json() as {
          data?: { username?: string | null; display_name?: string; email?: string };
        };
        user = body.data?.username || body.data?.display_name || body.data?.email || user;
      }
    } catch { /* the label falls back to "WakaTime" */ }
    return { user };
  },
};

export default apiKey;
