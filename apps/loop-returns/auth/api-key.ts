import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

export interface LoopCredential {
  apiKey: string;
}

/**
 * Probe: the cheapest Returns read, one return on a cursor page. Loop documents no ping and no
 * whoami; the Returns scope is the one every returns/deep-link integration holds. The response
 * is a list of returns (customer data), so it is classified but never read into a message.
 */
export const PROBE_PATH = "/warehouse/return/list?paginate=true&pageSize=1";

export function authHeaders(credential: Partial<LoopCredential>): Record<string, string> {
  return { "x-authorization": (credential.apiKey ?? "").trim() };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste a Loop API key (Loop Admin > Settings > Integrations > API). The key's " +
    "scopes (Returns, Orders, Customers, Destinations, Labels, Bulk Operations, Developer Tools) " +
    "decide which actions work.",
  connectionLabel: "Loop Returns",
  apiKey: { in: "header", name: "X-Authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Loop Admin > Settings > Integrations > API. Grant the scopes the workflows need; " +
        "the Returns scope is what this connection test uses.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<LoopCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<LoopCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const msg = errorText(body);

    if (res.ok && msg === null) {
      const returns = (body as { returns?: unknown } | null)?.returns;
      if (Array.isArray(returns)) return { ok: true };
      return {
        ok: false,
        message: `Loop answered ${res.status} but not with the documented returns page — ` +
          "not judged a valid key.",
      };
    }
    if (res.status === 401 || /unauthori[sz]ed/i.test(msg ?? "")) {
      return {
        ok: false,
        message: `Loop rejected the API key (${res.status}${msg ? `: ${msg}` : ""}). Check it ` +
          "was copied exactly and has not been revoked in Loop Admin.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Loop refused the returns read (403${msg ? `: ${msg}` : ""}). The key needs the ` +
          "Returns scope for this connection test.",
      };
    }
    return {
      ok: false,
      message: `Loop returned HTTP ${res.status}${msg ? `: ${msg}` : ""} for the returns probe`,
    };
  },
};

export default apiKey;
