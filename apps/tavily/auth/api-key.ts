import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorMessage } from "../lib/client.ts";

/**
 * Tavily API key — `Authorization: Bearer tvly-...`.
 *
 * Verified 2026-10-06 against the `bearerAuth` security scheme in the
 * OpenAPI embedded in `docs.tavily.com/documentation/api-reference/endpoint/*`.
 *
 * ## The probe: `GET /usage`
 *
 * Its response is `{key: {usage, limit, search_usage, ...}, account:
 * {current_plan, plan_usage, plan_limit, paygo_usage, ...}}` — credit counters
 * and the plan name, and **no key material**. It costs no credits, needs no
 * scope, and requires a credential (the documented 401 body is
 * `{"detail": {"error": "Unauthorized: missing or invalid API key."}}`).
 *
 * ## Classification is by body, not status
 *
 * Tavily returns 432/433 (key/plan or pay-as-you-go limit exceeded) for a key it
 * has already authenticated, so those mean "live key, no credits", which is a
 * reachability pass for this check. Only a body that says the key is missing or
 * invalid (or a 401/403 with no better information) fails it.
 */
export interface TavilyCredential {
  apiKey: string;
}

export const PROBE_PATH = "/usage";

/** The one place the wire format is built; `sign` and `test` share it. */
export function authHeaders(credential: Partial<TavilyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key from app.tavily.com. Keys start with `tvly-`.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one in the Tavily dashboard (app.tavily.com) under API Keys.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<TavilyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<TavilyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const msg = errorMessage(raw);

    // A live key that is out of credits or rate limited is still a live key.
    if (res.status === 429 || res.status === 432 || res.status === 433) return { ok: true };

    if (res.status === 401 || res.status === 403 || /api key|unauthori/i.test(msg ?? "")) {
      return {
        ok: false,
        message: `Tavily rejected the API key (${res.status}${msg ? `: ${msg}` : ""}). ` +
          "Check it was copied exactly and has not been revoked in the Tavily dashboard.",
      };
    }
    return {
      ok: false,
      message: `Tavily returned HTTP ${res.status} for ${PROBE_PATH}${msg ? `: ${msg}` : ""}`,
    };
  },
};

export default apiKey;
