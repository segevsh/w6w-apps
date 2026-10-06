import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Gladia API key — an unprefixed `x-gladia-key: <key>` header.
 *
 * Verified against the OpenAPI `securitySchemes.x_gladia_key` (`apiKey`, `in: header`,
 * `name: x-gladia-key`) and live probes on 2026-10-06.
 *
 * ## The status code does not separate a missing key from a wrong one — the body does
 *
 * An unauthenticated `GET /v2/pre-recorded` and one carrying a bogus key both answer
 * `401`. Only the `message` differs: `"no gladia key provided"` vs `"gladia user not
 * found"`. `test` classifies from that message, never from the status alone.
 *
 * ## Probe: `GET /v2/pre-recorded?limit=1`
 *
 * Cheap, read-only, bounded at one row, needs no capability a transcription key could lack,
 * and returns the caller's own job list (never a credential). There is no whoami endpoint.
 */
export interface GladiaCredential {
  apiKey: string;
}

export const PROBE_PATH = "/v2/pre-recorded";

export function authHeaders(credential: Partial<GladiaCredential>): Record<string, string> {
  return { "x-gladia-key": credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API key from app.gladia.io (Account > API keys).",
  apiKey: { in: "header", name: "x-gladia-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one at app.gladia.io. It is sent as the `x-gladia-key` header.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<GladiaCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<GladiaCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    let body: { message?: unknown; items?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* non-JSON body */ }
    const message = typeof body?.message === "string" ? body.message : "";

    if (res.ok) {
      return Array.isArray(body?.items)
        ? { ok: true }
        : { ok: false, message: "Gladia answered 2xx but not with a job list" };
    }
    if (res.status === 401 || /gladia (key|user)/i.test(message)) {
      return {
        ok: false,
        message: /user not found/i.test(message)
          ? "Gladia rejected the key (gladia user not found) — check it was copied whole"
          : /no gladia key/i.test(message)
          ? "Gladia received no key — the credential's apiKey did not reach the request"
          : `Gladia returned 401${message ? `: ${message}` : ""}`,
      };
    }
    // A throttled request proves the key was recognised.
    if (res.status === 429) return { ok: true };
    return {
      ok: false,
      message: `Gladia returned HTTP ${res.status} for GET ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default apiKey;
