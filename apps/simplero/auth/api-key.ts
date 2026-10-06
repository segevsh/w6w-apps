import type { AuthDefinition } from "@w6w/types";
import { API_ORIGIN, API_PREFIX, errorMessage, USER_AGENT } from "../lib/client.ts";

export interface SimpleroCredential {
  apiKey: string;
}

/** The header Simplero's `apiKeyHeader` security scheme names. */
export function authHeaders(credential: Partial<SimpleroCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/**
 * The credential probe: one lists row of email lists. It is a plain read that needs no scope the
 * key could lack beyond "can use the API", and — unlike a whoami — its body is a page of lists, so
 * it never echoes the key. Simplero publishes no account/whoami endpoint in v2.
 */
export const PROBE_PATH = `${API_PREFIX}/lists`;

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from the Simplero admin under Settings > Integrations. Simplero also " +
    "accepts the key as an HTTP Basic username with a blank password; this app sends it in the " +
    "X-API-Key header.",
  apiKey: { in: "header", name: "X-API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Simplero admin > Settings > Integrations.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<SimpleroCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const apiKey = ((credential as Partial<SimpleroCredential>)?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_ORIGIN}${PROBE_PATH}?per_page=1`, {
      headers: { accept: "application/json", "user-agent": USER_AGENT, ...authHeaders({ apiKey }) },
    });
    const text = await res.text().catch(() => "");
    const contentType = res.headers.get("content-type") ?? "";

    // Decide from the body, not the status line: a genuine answer is a JSON `{ data: [...] }`;
    // a bad key is `{ "error": "Bad API key" }`.
    let body: { data?: unknown; error?: unknown; errors?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }

    if (body && Array.isArray(body.data)) return { ok: true };

    if (body && typeof body.error === "string") {
      return {
        ok: false,
        message: `Simplero rejected the key: ${body.error}. Copy it again from ` +
          "Settings > Integrations.",
      };
    }
    return {
      ok: false,
      message: errorMessage(res.status, "GET", PROBE_PATH, contentType, text),
    };
  },
};

export default apiKeyAuth;
