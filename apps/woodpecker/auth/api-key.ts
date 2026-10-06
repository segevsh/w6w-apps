import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorMessage, V2 } from "../lib/client.ts";

/**
 * Woodpecker API key — sent as the `x-api-key` header (reference: "Authentication").
 *
 * Keys are user-specific and made under Add-ons > API & Integrations > API keys.
 * The API add-on must be on the plan (a `401 "No API addon"` / `"Upgrade your plan"`
 * otherwise).
 *
 * ## The probe
 *
 * `GET /rest/v2/users`: the account's user list (name, email, role), which never
 * contains an API key. Measured 2026-10-06 with a bogus key: HTTP 401
 * `{"title":"Unauthorized","status":401,"detail":"Invalid api key","timestamp":…}`,
 * while a route that does not exist answers a different shape, so the 401 is the
 * auth layer. (`GET /rest/v1/me`, which the reference's example uses, is not
 * documented as a v1 resource, and answers v1's differently-shaped error.)
 *
 * The verdict is read from the BODY: Woodpecker's rejection is `detail: "Invalid api
 * key"`; `"No API addon"` and `"Upgrade your plan"` are separate, plan-level 401s
 * reported as such. The status code alone never decides.
 */
export const PROBE_PATH = `${V2}/users`;

export interface WoodpeckerCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<WoodpeckerCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Woodpecker API key (Add-ons > API & Integrations > API keys).",
  connectionLabel: "Woodpecker",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Woodpecker > Add-ons > API & Integrations > API keys > Create a key. " +
        "Requires the API add-on.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(
        authHeaders(credential as Partial<WoodpeckerCredential>),
      )
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<WoodpeckerCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    const { message } = errorMessage(body);
    if (message && /invalid api key/i.test(message)) {
      return {
        ok: false,
        message: "Woodpecker rejected the API key (invalid or revoked). Create a key under " +
          "Add-ons > API & Integrations > API keys and reconnect.",
      };
    }
    if (message && /(no api addon|upgrade your plan)/i.test(message)) {
      return {
        ok: false,
        message: `Woodpecker accepted the key's format but the plan has no API access: ${message}`,
      };
    }
    return {
      ok: false,
      message: `Woodpecker returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${message ? `: ${message}` : ""}`,
    };
  },
};

export default apiKey;
