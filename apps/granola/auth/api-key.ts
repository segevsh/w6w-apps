import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, type GranolaErrorBody } from "../lib/client.ts";

/**
 * Granola API key — `Authorization: Bearer grn_...`.
 *
 * Verified against `components.securitySchemes.ApiKeyAuth` in the vendor's
 * OpenAPI 3.1 document (`{"type":"http","scheme":"bearer","bearerFormat":"apiKey"}`
 * — an HTTP bearer scheme, not a custom header) and the Quick Start example in
 * `docs.granola.ai/introduction`, which shows the `grn_` prefix and the exact
 * header. Confirmed live on 2026-09-29.
 *
 * ## Scopes are the key's own business, not this app's
 *
 * Granola keys are Personal-notes and/or Public-notes scoped (help center:
 * "Granola API" — Access scopes), or a workspace-wide key created by an admin.
 * Nothing here assumes a scope: every Action just calls the endpoint the user
 * asked for and surfaces whatever Granola itself returns or refuses.
 *
 * ## The probe: `GET /v1/folders?page_size=1`
 *
 * Granola documents no dedicated whoami/ping endpoint. `/v1/folders` was
 * chosen over `/v1/notes` for the liveness probe because it returns nothing
 * that reads as user data (a folder is just `{id, name, parent_folder_id}`) —
 * `/v1/notes` would return real note titles and owner names on every health
 * check. `page_size=1` keeps it to the smallest page the API allows.
 */
export interface GranolaCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared with `test` below. */
export function authHeaders(credential: Partial<GranolaCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

export const PROBE_PATH = "/folders";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste a personal or workspace API key from Granola desktop app > Settings > " +
    "Connectors > API keys (or Workspace API keys, for admins).",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Granola desktop app > Settings > Connectors > API keys > Create new key. Starts " +
        "with grn_.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<GranolaCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Classifies liveness from the response BODY, never the status code alone —
   * confirmed live on 2026-09-29:
   *
   *   no header  -> 401 `{"code":"MISSING_API_KEY", "message":"Missing or invalid
   *                 Authorization header. Expected: Bearer <api_key|token>"}`
   *   bad token  -> 401 `{"code":"INVALID_API_KEY", "message":"Invalid API key format"}`
   *
   * Both were observed against the real host, not guessed at from the OpenAPI
   * doc alone (which only says "401 Unauthorized - Invalid API key" for every
   * case, not the `code` values that actually distinguish them).
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GranolaCredential>;
    const token = (cred?.apiKey ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?page_size=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as GranolaErrorBody | null;
    const code = body?.code;

    if (code === "MISSING_API_KEY") {
      return {
        ok: false,
        message: "Granola received no API key. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (code === "INVALID_API_KEY" || res.status === 401) {
      return {
        ok: false,
        message: `Granola rejected the API key (${res.status}${code ? ` ${code}` : ""}). Check ` +
          "it was copied exactly and has not been revoked in Settings > Connectors > API keys.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Granola refused the folders read (403${code ? ` ${code}` : ""})` +
          `${body?.message ? `: ${body.message}` : ""}`,
      };
    }
    return { ok: false, message: `Granola returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKey;
