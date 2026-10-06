import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorInfo } from "../lib/client.ts";

/**
 * Mem API key — `Authorization: Bearer <key>` (Mem > Settings > API).
 *
 * ## The probe
 *
 * `GET /v2/collections?limit=1`: it needs a credential and returns collection
 * titles only, never the caller's key. Measured 2026-10-06 against the live API
 * with no and with a bogus key: both answer 401 with the platform envelope
 * `{"error_category":"CLIENT_ERROR","error_metadata":{"error_kind":
 * "NOT_AUTHORIZED","message":...}}`. The verdict comes from that body's
 * `error_kind`, not from the bare status: a 401 without it is reported as an
 * unexpected answer rather than as a bad key.
 */
export const PROBE_PATH = "/v2/collections";

export interface MemCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<MemCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "A Mem API key, created under Settings > API in Mem.",
  connectionLabel: "Mem",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one in Mem under Settings > API. It acts as you, on all your notes.",
    },
  ],

  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as Partial<MemCredential>))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<MemCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    const info = errorInfo(body);
    if (info.kind === "NOT_AUTHORIZED") {
      return {
        ok: false,
        message: "Mem rejected the API key (invalid or malformed). Create a key under " +
          "Settings > API in Mem and reconnect.",
      };
    }
    return {
      ok: false,
      message: `Mem returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${info.message ? `: ${info.message}` : ""}`,
    };
  },
};

export default apiKey;
