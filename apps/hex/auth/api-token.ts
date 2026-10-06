import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, parseErrorBody } from "../lib/client.ts";

/**
 * Hex API token, sent as `Authorization: Bearer <token>`.
 *
 * Verified against Hex's OpenAPI document (`components.securitySchemes.bearerAuth`:
 * `http` / `bearer`) and live probes of app.hex.tech on 2026-10-06.
 *
 * ## Why `GET /users/me` is the probe
 *
 * Its documented response is `{ id, name, email, role, lastLoginDate, org }` for a
 * personal token and just `{ org, token: { exp } }` for a workspace token. Neither
 * shape contains the token itself (only its expiry), so it is safe to read.
 *
 * ## Classification
 *
 * An unsigned or bad-token request is answered at the edge with HTTP 401, the
 * plain-text body `Unauthorized` and a `WWW-Authenticate: Bearer` header (with
 * `error="invalid_token"` when a token was presented). That is NOT the JSON error
 * shape the routes use. A 403 with a JSON error body comes from a route, so the
 * token authenticated and merely lacks a scope: the credential is live.
 */
export interface HexCredential {
  apiToken: string;
}

export function authHeaders(credential: Partial<HexCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

export const PROBE_PATH = "/users/me";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste a Hex API token (workspace token or personal access token) from Hex > Settings > " +
    "API keys. Grant it only the scopes the workflows on this connection need.",
  connectionLabel: "Hex ({{label}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Hex > Settings > API keys. A personal token acts as you; a workspace token acts as " +
        "the workspace and cannot read user metadata.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<HexCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<HexCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const body = parseErrorBody(raw);
    const code = body?.code ?? body?.reason;

    // A structured route-level refusal means the token authenticated.
    if (res.status === 403 && body && code) return { ok: true };

    if (res.status === 401 || code === "UNAUTHORIZED") {
      return {
        ok: false,
        message: "Hex rejected the token (401). Check it was copied exactly and has not been " +
          "revoked or expired in Hex > Settings > API keys.",
      };
    }
    return { ok: false, message: `Hex returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish a display label. A workspace token returns no user fields, so the
   * label falls back to the org id; only `label`, `email` and `orgId` are kept.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<HexCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        email?: string;
        name?: string | null;
        org?: { id?: string };
      };
      const label = body?.email ?? body?.name ?? body?.org?.id;
      if (!label) return {};
      const out: Record<string, string> = { label };
      if (body.email) out.email = body.email;
      if (body.org?.id) out.orgId = body.org.id;
      return out;
    } catch {
      return {};
    }
  },
};

export default apiToken;
