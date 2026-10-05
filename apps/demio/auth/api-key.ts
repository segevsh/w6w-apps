import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * API key + API secret (`custom`) — Demio authenticates with TWO headers, which is why this
 * is `custom` rather than `apiKey`:
 *
 *   Api-Key: <key>
 *   Api-Secret: <secret>
 *
 * Header names from the vendor's Apiary blueprint ("Ping via Headers"). Both are generated in
 * Demio under Settings > API.
 *
 * ## Liveness probe: `GET /ping`
 *
 * Its documented body is `{"pong": true}` (plus `sandbox` when a sandbox key is used) and it
 * never echoes the credential. The verdict is read from the BODY's `pong` flag and `messages`,
 * not the status: the blueprint documents 200 (ok), 401 `Authorization failed` (bad key or
 * secret) and 403 `Account is not active` (valid credentials, deactivated account).
 */
export interface DemioCredential {
  apiKey: string;
  apiSecret: string;
}

export const PROBE_PATH = "/ping";

export function authHeaders(c: Partial<DemioCredential>): Record<string, string> {
  return { "api-key": c.apiKey ?? "", "api-secret": c.apiSecret ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key & Secret",
  description:
    "From Demio > Settings > API. Both values are sent as `Api-Key` and `Api-Secret` headers.",
  connectionLabel: "Demio",
  fields: [
    { key: "apiKey", label: "API Key", type: "secret", required: true },
    { key: "apiSecret", label: "API Secret", type: "secret", required: true },
  ],

  /** The only hook handed the credential. It stamps both headers and returns. */
  sign({ request, credential }) {
    for (const [k, v] of Object.entries(authHeaders(credential as Partial<DemioCredential>))) {
      request.headers[k] = v;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<DemioCredential>;
    if (!cred?.apiKey?.trim() || !cred?.apiSecret?.trim()) {
      return { ok: false, message: "credential missing apiKey or apiSecret" };
    }
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    const body = await res.json().catch(() => null) as
      | { pong?: boolean; messages?: string[] }
      | null;
    if (body?.pong === true) return { ok: true };
    const detail = body?.messages?.join("; ");
    if (body && body.pong === false) {
      return {
        ok: false,
        message: `Demio rejected the credentials${detail ? `: ${detail}` : ""}.` +
          " Check the key and secret in Demio > Settings > API.",
      };
    }
    return { ok: false, message: `Demio returned an unexpected answer (HTTP ${res.status}).` };
  },
};

export default apiKey;
