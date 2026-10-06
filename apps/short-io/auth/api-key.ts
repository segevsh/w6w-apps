import type { AuthDefinition } from "@w6w/types";
import { API_BASE, describeError } from "../lib/client.ts";

/**
 * Short.io API key — `Authorization: <key>`, with NO `Bearer` prefix.
 *
 * Verified 2026-10-06: the OpenAPI document's only security scheme is
 * `apiKey: {type: apiKey, in: header, name: Authorization}`, and live probes
 * against `api.short.io` answer `401 {"error":"Unauthorized"}` both with no
 * header and with a fake one.
 *
 * Short.io issues two kinds of key. A **secret** key (Integrations & API in the
 * dashboard) is what every action here needs. A **public** key (`pk_…`) is only
 * accepted by `POST /links/public`, which this app does not call.
 *
 * ## The probe: `GET /api/domains`
 *
 * It needs a credential (401 without one), is not scoped to any one resource,
 * and its response schema is an array of domain objects (hostname, state,
 * plan, integration ids…) — none of which is the caller's key. There is no
 * whoami endpoint in the spec at all, so there is nothing leakier to avoid.
 *
 * Classified from the body, not the status: `{"error":"Unauthorized"}` is the
 * vendor's own rejection; a JSON array is a live credential.
 */

export interface ShortCredential {
  apiKey: string;
}

/** The one place the wire format is built; `sign` and `test` both call it. */
export function authHeaders(credential: Partial<ShortCredential>): Record<string, string> {
  return { authorization: (credential.apiKey ?? "").trim() };
}

export const PROBE_PATH = "/api/domains";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste a secret API key from Short.io dashboard > Integrations & API.",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Short.io dashboard > Integrations & API > Create API key. Use a secret key, not " +
        "a public (pk_) key.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<ShortCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<ShortCredential>;
    if (!(cred?.apiKey ?? "").trim()) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    const body = await res.json().catch(() => null);
    // A live key answers with a JSON array of domains.
    if (res.ok && Array.isArray(body)) return { ok: true };
    if (res.status === 401) {
      return {
        ok: false,
        message: `Short.io rejected the API key (${describeError(body, "Unauthorized")}). ` +
          "Check it was copied exactly and has not been deleted.",
      };
    }
    if (res.ok) {
      return { ok: false, message: "Short.io answered 200 but not with a domain list" };
    }
    return {
      ok: false,
      message: `Short.io returned HTTP ${res.status}: ${describeError(body, "")}`,
    };
  },
};

export default apiKey;
