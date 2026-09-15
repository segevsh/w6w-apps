import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Shortcut API Token — a `Shortcut-Token` header carrying the token verbatim.
 *
 * Verified against Shortcut's OpenAPI 3.0 document
 * (`components.securitySchemes.api_token`, fetched 2026-09-15) and live probes
 * against `api.app.shortcut.com` on the same day.
 *
 * ## The header is the whole story
 *
 * `components.securitySchemes` declares exactly one scheme: `apiKey`, `in:
 * header`, `name: Shortcut-Token`. There is no `Bearer ` prefix and no
 * alternative query-parameter form — the raw token value is the header value.
 * Shortcut publishes no OAuth2 surface for third-party integrations; the token
 * (generated per-member under Settings > API Tokens in the Shortcut web app) is
 * the entire authentication story.
 *
 * ## The probe: `GET /api/v3/member`
 *
 * Chosen because it is the one endpoint that answers "is this token live?"
 * without requiring any particular workspace permission and without handing
 * back anything sensitive:
 *
 * - **It requires a credential.** Live probes on 2026-09-15 confirmed two
 *   distinct 401 shapes, both `{"message": "...", "tag": "..."}`:
 *   - No `Shortcut-Token` header at all: `{"tag": "organization2_missing",
 *     "message": "Sorry, the organization context for this request is
 *     missing..."}`.
 *   - A syntactically-plausible but wrong/revoked token:
 *     `{"tag": "unauthorized", "message": "Unauthorized"}`.
 * - **It returns no credential material.** `MemberInfo`'s schema is
 *   `{id, is_owner, mention_name, name, role, workspace2, organization2}` —
 *   workspace/org display metadata, never a token or secret.
 * - **It needs no resource-level permission.** Every Shortcut member — Owner,
 *   Admin, or plain Member — can read their own `/member`, so this probe cannot
 *   report a working, correctly-scoped token as broken.
 */

export interface ShortcutCredential {
  apiToken: string;
}

/** The one place the wire format is built, so `sign` and `test` share it. */
export function authHeaders(credential: Partial<ShortcutCredential>): Record<string, string> {
  return { "shortcut-token": credential.apiToken ?? "" };
}

export const PROBE_PATH = "/member";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description: "Generate a token from Shortcut > your avatar > Settings > API Tokens.",
  connectionLabel: "Shortcut ({{name}})",
  apiKey: { in: "header", name: "Shortcut-Token" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Shortcut > your avatar (bottom left) > Settings > API Tokens > Generate Token.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ShortcutCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<ShortcutCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string; tag?: string } | null;
    const tag = body?.tag;

    if (tag === "organization2_missing") {
      return {
        ok: false,
        message:
          "Shortcut received no token. The credential did not reach the request — reconnect " +
          "this connection.",
      };
    }
    if (tag === "unauthorized" || res.status === 401) {
      return {
        ok: false,
        message: `Shortcut rejected the token (${res.status}${tag ? ` ${tag}` : ""}). Check it ` +
          "was copied exactly and has not been revoked under Settings > API Tokens.",
      };
    }
    return {
      ok: false,
      message: `Shortcut returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },

  /**
   * Publish the member's display name, and nothing else.
   *
   * `MemberInfo` carries no credential material, so nothing needs to be
   * dropped here — unlike the pack's `/me`-shaped traps (Follow Up Boss, Mailjet,
   * Apify's `users/me`), `/member` is safe to read in full. Only `name` is kept
   * because that is all the connection label uses.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ShortcutCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { name?: string; mention_name?: string };
      const name = body?.name ?? body?.mention_name;
      return name ? { name } : {};
    } catch {
      return {};
    }
  },
};

export default apiToken;
