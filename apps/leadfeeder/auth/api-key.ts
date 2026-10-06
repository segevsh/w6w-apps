import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, AUTH_ERROR_CODES, vendorError } from "../lib/client.ts";

/**
 * Leadfeeder / Dealfront API key — `X-Api-Key: <key>`, applied in `sign`.
 *
 * Verified 2026-10-06 against the OpenAPI `securitySchemes.ApiKeyAuth` (`in: header`, name
 * `X-Api-Key`; "API keys are scoped to their owner's accounts") and live probes: no header
 * answers HTTP 401 `missing_token`, a bogus key HTTP 401 `invalid_api_key`. The legacy
 * `Authorization: Token token=…` scheme belongs to the legacy API and is NOT used here.
 * (The same host also takes OAuth2 access tokens; this app models the API key only.)
 *
 * ## Probe: `GET /v1/users/me`
 *
 * Returns the key owner's identity (`email`, names, `team_role`), never the key, and needs no
 * `account_id`. The verdict is read from the body's `errors[0].code`, not the status.
 */
export interface LeadfeederCredential {
  apiKey: string;
}

export const PROBE_PATH = "/v1/users/me";

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
  description: "A Leadfeeder (Dealfront) personal API key, sent in the `X-Api-Key` header.",
  connectionLabel: "Leadfeeder ({{user}})",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "Leadfeeder > Settings > Personal > API keys. The key is scoped to your accounts.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as Partial<LeadfeederCredential>;
    request.headers["x-api-key"] = (key ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<LeadfeederCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    let res: Response;
    try {
      res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    } catch (e) {
      return { ok: false, message: `could not reach the Leadfeeder API: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }
    const err = vendorError(body);

    if (res.ok) {
      const id = (body as { data?: { id?: unknown } } | undefined)?.data?.id;
      return typeof id === "string" && id !== "" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from ${PROBE_PATH} — no user in it`,
      };
    }
    if (err?.code && AUTH_ERROR_CODES.has(err.code)) {
      return {
        ok: false,
        message: `Leadfeeder rejected the API key (${err.code}). Create a key under Settings > ` +
          "Personal > API keys.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Leadfeeder rate-limited the key check (429); try again" };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Leadfeeder is erroring (HTTP ${res.status})` };
    }
    return {
      ok: false,
      message: `Leadfeeder answered HTTP ${res.status}${
        err?.code ? ` (${err.code}${err.title ? `: ${err.title}` : ""})` : ""
      } for ${PROBE_PATH}`,
    };
  },

  /** Records the key owner's email for the connection label. */
  async afterConnect({ credential }, ctx) {
    let user = "Leadfeeder";
    try {
      const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
      const res = await ctx.fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
      if (res.ok) {
        const body = await res.json() as { data?: { attributes?: { email?: string } } };
        user = body.data?.attributes?.email || user;
      }
    } catch { /* the label falls back to "Leadfeeder" */ }
    return { user };
  },
};

export default apiKey;
