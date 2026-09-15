import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatMindeeError } from "../lib/client.ts";

/**
 * Mindee V2 API key — `Authorization: <key>`, verbatim, no scheme prefix.
 *
 * Verified against Mindee's OpenAPI 3.1 document's `components.securitySchemes`
 * (`{"type": "apiKey", "in": "header", "name": "Authorization"}` — silent on
 * whether a scheme prefix belongs on the value), the official
 * `mindee-api-python` SDK (`mindee/v2/mindee_http/mindee_api_v2.py`:
 * `headers["Authorization"] = self.api_key`, no prefix), and a live probe on
 * 2026-09-15: sending `Authorization: Bearer md_...` against
 * `api-v2.mindee.net` answers `401-009 "Organization ID is required for JWT
 * authentication. Do not include \`Bearer \` if using an API key."` Mindee's
 * own error-handling docs state the same rule directly: "API keys are not
 * JWTs: do not include `Bearer` in your `Authentication` header."
 *
 * V1 and V2 keys are entirely separate (Mindee's own FAQ: "No, V1 and V2 do
 * not share API key information") — this app is V2-only (`api-v2.mindee.net`),
 * so a V1 key (used against the legacy `api.mindee.net`) will not work here.
 *
 * An API key is unlimited-lifetime and organization-scoped (every key can use
 * every model in the organization) — there is no per-model or read-only key
 * tier to prefer for the probe below.
 */

export interface MindeeCredential {
  apiKey: string;
}

/** The one place the wire format is built, reused by `sign` and `test`. */
export function authHeaders(credential: Partial<MindeeCredential>): Record<string, string> {
  return { authorization: credential.apiKey ?? "" };
}

/**
 * `GET /v2/search/models` — the cheapest authenticated read Mindee documents.
 * Every key can call it (it needs no per-model scope, since keys are not
 * scoped per-model), and the response carries organization metadata the
 * account owner already has, not a secret: model ids/names and each model's
 * OWN configured webhook URLs — never the API key itself.
 */
export const PROBE_PATH = "/v2/search/models";

interface ProbeErrorBody {
  code?: string;
  detail?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Mindee V2 API key (starts with md_), created on the Mindee Platform.",
  // No `prefix` — the wire value is the raw key, never `Bearer <key>`.
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Starts with md_. Create one on the Mindee Platform under Settings → API Keys.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = (credential ?? {}) as Partial<MindeeCredential>;
    request.headers["authorization"] = authHeaders({ apiKey: apiKey ?? "" }).authorization;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = (credential ?? {}) as Partial<MindeeCredential>;
    if (!apiKey) return { ok: false, message: "No API key provided." };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?per_page=1`, {
      headers: { ...authHeaders({ apiKey }), accept: "application/json" },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let body: ProbeErrorBody | null = null;
    try {
      body = JSON.parse(raw) as ProbeErrorBody;
    } catch { /* not JSON */ }

    // The three 401 codes Mindee distinguishes are three different problems
    // with three different fixes, and all three arrive as a bare 401 without
    // `code`. Collapsing them is how "you sent Bearer by mistake" gets
    // misreported as "your key is wrong".
    switch (body?.code) {
      case "401-001":
        return { ok: false, message: `Mindee rejected the API key as invalid (${body.code}).` };
      case "401-008":
        return { ok: false, message: `Mindee received no credential (${body.code}).` };
      case "401-009":
        return {
          ok: false,
          message: `Mindee refused a Bearer-prefixed key — send the raw key (${body.code}).`,
        };
      default:
        return { ok: false, message: formatMindeeError(res.status, "GET", PROBE_PATH, raw) };
    }
  },
};

export default apiKey;
