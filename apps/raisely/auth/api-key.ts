import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, parseError } from "../lib/client.ts";

/**
 * Raisely API key — `Authorization: Bearer <api key>`.
 *
 * Verified against `components.securitySchemes.BearerAuth` in Raisely's OpenAPI document
 * (`{"type": "http", "scheme": "bearer", "description": "A valid API Key, access token, or
 * user-issued JWT"}`) and live probes against `api.raisely.com` on 2026-10-06. (A second scheme,
 * `QueryToken`, takes a user access token in `?accessToken=` — this app never puts a credential
 * in a URL.) Keys are created in Raisely under Settings > API & Webhooks.
 *
 * ## The probe, and why it asks for `private=true`
 *
 * `GET /campaigns?private=true&limit=1` — a bounded read that carries no credential material
 * (the campaign record has `publicKey`/`privateKey` fields documented as "internal — ignored",
 * but nothing of the caller's own key). The `private=true` matters: the spec's global security
 * accepts anonymous callers, so a bare list is not proof that a key was checked. Measured live:
 *
 *     no key            -> 403 {"code":"forbidden","detail":"You are not authorized to do that"}
 *     bogus bearer      -> 401 {"code":"unauthorized", errors[0].subcode:"invalid token"}
 *
 * ## Classified from the body
 *
 * The verdict comes from the vendor's own `code`, with the status only a hint. A 2xx must also
 * carry the documented `{data: [...]}` envelope — a 200 with anything else (an edge shell) is not
 * a pass.
 */

export interface RaiselyCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<RaiselyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

export const PROBE_PATH = "/campaigns";
export const PROBE_QUERY = "?private=true&limit=1";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key from Raisely > Settings > API & Webhooks. It is sent as a " +
    "Bearer token on every request.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Raisely > Settings > API & Webhooks.",
    },
  ],

  /** The only hook handed the raw credential, and it runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<RaiselyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<RaiselyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}${PROBE_QUERY}`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey: key }) } },
    );
    const raw = await res.text().catch(() => "");

    if (res.ok) {
      let body: { data?: unknown } | null = null;
      try {
        body = JSON.parse(raw);
      } catch { /* not JSON */ }
      if (body && Array.isArray(body.data)) return { ok: true };
      return {
        ok: false,
        message: `Raisely answered HTTP ${res.status} but not with a {data: [...]} envelope — ` +
          "this is not the API.",
      };
    }

    const { code, detail, subcode } = parseError(raw);
    if (code === "unauthorized" || (!code && res.status === 401)) {
      return {
        ok: false,
        message: `Raisely rejected the API key (${subcode ?? detail ?? "unauthorized"}). Check ` +
          "it was copied exactly from Settings > API & Webhooks and has not been revoked.",
      };
    }
    if (code === "forbidden" || (!code && res.status === 403)) {
      return {
        ok: false,
        message: `Raisely refused the campaigns read (${detail ?? "forbidden"}). The key is ` +
          "missing, malformed, or not permitted to read this organisation's campaigns.",
      };
    }
    if (!code && !detail) {
      return {
        ok: false,
        message: `Raisely returned HTTP ${res.status} with an unreadable body for ${PROBE_PATH}.`,
      };
    }
    return { ok: false, message: `Raisely returned HTTP ${res.status}: ${code ?? detail}` };
  },
};

export default apiKey;
