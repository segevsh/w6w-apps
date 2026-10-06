import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorDetail } from "../lib/client.ts";

/**
 * Eden AI API key - `Authorization: Bearer <key>`.
 *
 * Verified against the OpenAPI document (`components.securitySchemes.AuthBearer`, an HTTP bearer
 * scheme) and live probes against `api.edenai.run` on 2026-10-06.
 *
 * ## Why the probe is `GET /v3/universal-ai/async?limit=1`
 *
 * Measured live, unauthenticated:
 *
 *  - `GET /v3/info` and `GET /v3/models` answer **200 to anyone** (the second one is 1.5 MB). Using
 *    either as the probe would pass a Connection whose key never reached the request, so neither
 *    is the probe.
 *  - Every account-owned route (`/v3/universal-ai/async`, `/v3/upload`, `/v3/videos`,
 *    `/v3/universal-ai/collections`) answers `403 {"detail":"Not authenticated"}` with no
 *    Authorization header and `401 {"detail":"Invalid token"}` with a wrong key.
 *
 * The async-job list is the cheapest of the account-owned reads: free, read-only, one row, and
 * its response is the caller's own job metadata - it never echoes the key.
 *
 * The verdict comes from the `detail` string, with the status code only as a hint: a missing
 * header and a wrong key answer with different statuses AND different bodies, and they need
 * different fixes (reconnect vs. re-copy the key).
 */
export interface EdenCredential {
  apiKey: string;
}

export const PROBE_PATH = "/universal-ai/async";

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<EdenCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from the Eden AI dashboard (API keys). A custom key with its own budget " +
    "or expiry works, and so does a sandbox token for testing without real provider calls.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Eden AI dashboard > API keys. Use a custom key for this connection so it can carry " +
        "its own budget and be revoked on its own.",
    },
  ],

  /** The only hook handed the raw credential; network-less. Stamps the bearer header. */
  sign({ request, credential }) {
    const cred = credential as Partial<EdenCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<EdenCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const detail = errorDetail(raw);

    if (detail === "Not authenticated") {
      return {
        ok: false,
        message: "Eden AI received no key. The credential did not reach the request - " +
          "reconnect this connection.",
      };
    }
    if (detail === "Invalid token" || res.status === 401) {
      return {
        ok: false,
        message: `Eden AI rejected the key (${res.status}${detail ? ` ${detail}` : ""}). Check ` +
          "it was copied exactly and has not been revoked or expired in the Eden AI dashboard.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Eden AI refused this key (403${detail ? ` ${detail}` : ""}).`,
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Eden AI rate-limited the check (429); try again shortly." };
    }
    return {
      ok: false,
      message: `Eden AI returned HTTP ${res.status} for ${PROBE_PATH}${
        detail ? `: ${detail}` : ""
      }`,
    };
  },
};

export default apiKey;
