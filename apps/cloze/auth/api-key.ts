import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorCode, errorMessage } from "../lib/client.ts";

/**
 * Cloze API key — `Authorization: Bearer <api key>`.
 *
 * The OpenAPI document offers the key two ways: an `api_key` query parameter or the same value
 * as a bearer token ("the same way an Oauth2 access token is provided"). The header form is
 * used so the key never lands in a URL, a log line or a proxy's access log. Keys are made in
 * Cloze under Settings > Integrations > Cloze API (help.cloze.com/article/2176-api-key).
 * OAuth2 exists too, but is only required for publishing a public integration.
 *
 * ## The probe
 *
 * `GET /v1/user/stages/people`: the account's contact-stage labels (`{list: [{name, key}]}`),
 * needing only the basic scope and carrying no profile data and no key. `/v1/user/profile`
 * is the obvious whoami, but it returns the account's email, phone and address, which a health
 * probe has no business reading.
 *
 * Measured unsigned/garbage on 2026-10-06: no credential answers 401
 * `{"errorcode":1,"message":"The API key was not found"}`; a bearer the gateway cannot resolve
 * answers 401 `{"message":"Invalid token: access token is invalid"}`; an unknown path answers
 * 404 `{"errorcode":404,"message":"Resource Not Found"}`. `test` classifies on the body: a pass
 * needs `errorcode` 0 (or absent) and a `list` array, a rejection is recognised by the
 * vendor's own sentence, and anything else is reported verbatim.
 */
export const PROBE_PATH = "/v1/user/stages/people";

export interface ClozeCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<ClozeCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

const REJECTED = /api key was not found|invalid token|access token|not authorized|unauthorized/i;

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Cloze API key, from Cloze > Settings > Integrations > Cloze API.",
  connectionLabel: "Cloze",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one in Cloze under Settings > Integrations > Cloze API. It acts as the " +
        "Cloze user that created it.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<ClozeCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<ClozeCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;
    const code = errorCode(body);
    if (res.ok && (code === undefined || code === 0) && Array.isArray(body?.list)) {
      return { ok: true };
    }

    const vendor = errorMessage(body);
    if (vendor && REJECTED.test(vendor)) {
      return {
        ok: false,
        message: "Cloze rejected the API key (invalid or missing). Create a key under " +
          "Settings > Integrations > Cloze API and reconnect.",
      };
    }
    return {
      ok: false,
      message: `Cloze returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${vendor ? `: ${vendor}` : " with an unexpected body"}`,
    };
  },
};

export default apiKey;
