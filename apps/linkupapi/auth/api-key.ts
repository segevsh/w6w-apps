import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, parseEnvelope } from "../lib/client.ts";

export interface LinkupApiCredential {
  apiKey: string;
}

/**
 * `GET /v2/credits` is the probe: it needs only the key (no account), costs nothing, and its
 * body is `{data:{credits}}` — a count, never a secret. It is not `GET /v2/accounts`, which
 * lists the connected accounts' names and is more than a liveness check needs.
 */
export const PROBE_PATH = "/v2/credits";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A LinkupAPI key (app.linkupapi.com), sent in the x-api-key header.",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one in the LinkupAPI dashboard. Connect your LinkedIn account there, then " +
        "use List Accounts for the account_id that actions take.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<LinkupApiCredential>;
    request.headers["x-api-key"] = (apiKey ?? "").trim();
    return request;
  },

  /** The verdict comes from the body's error code, not the status. */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<LinkupApiCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const raw = await res.text().catch(() => "");
    const env = parseEnvelope(raw);
    const code = env?.error?.code;

    if (env?.success === true && typeof (env.data as { credits?: unknown })?.credits === "number") {
      return { ok: true };
    }
    if (code === "INVALID_API_KEY") {
      return {
        ok: false,
        message: `LinkupAPI rejected the API key (${res.status}). Check it was copied exactly ` +
          "and has not been revoked.",
      };
    }
    if (code === "RATE_LIMITED" || res.status === 429) {
      return { ok: false, message: "LinkupAPI rate-limited the key check (429); try again" };
    }
    return {
      ok: false,
      message: `LinkupAPI answered HTTP ${res.status}${code ? ` ${code}` : ""} for ${PROBE_PATH}` +
        `${env?.error?.message ? `: ${env.error.message}` : ""}`,
    };
  },
};

export default apiKey;
