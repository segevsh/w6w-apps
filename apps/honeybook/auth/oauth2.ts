import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization code + PKCE (the OpenAPI `securitySchemes.oauth2`
 * has exactly one flow, `authorizationCode`).
 *
 * HoneyBook is NOT the authorization server: the OAuth endpoints live on
 * `oauth.honeybook.com`, a different host from the API. There is no `/token`
 * under `/api/v3`. OAuth endpoint hosts are allowed implicitly, so
 * `oauth.honeybook.com` is deliberately absent from `network.allow`.
 *
 * Client authentication is `private_key_jwt` (RFC 7523): HoneyBook issues no
 * client secret. The registered client publishes a JWKS URL and signs a
 * `client_assertion` at the token endpoint. That is a property of the host's
 * token exchange, not of this app — see the README.
 *
 * Scopes: `openid`, `honeybook.api` and `offline_access` are required on
 * essentially every integration (`honeybook.api` is "necessary but never
 * sufficient"); the five resource scopes are the ones the OpenAPI document
 * lists. There is no `contacts.read` scope and no contact read endpoint.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with HoneyBook)",
  description:
    "Authorization code flow with PKCE. HoneyBook registers applications itself (preview, by request) and issues a client_id plus a JWKS-based private_key_jwt client identity rather than a client secret.",
  oauth2: {
    authorizationUrl: "https://oauth.honeybook.com/oauth2/auth",
    tokenUrl: "https://oauth.honeybook.com/oauth2/token",
    refreshUrl: "https://oauth.honeybook.com/oauth2/token",
    revokeUrl: "https://oauth.honeybook.com/oauth2/revoke",
    scopes: [
      "openid",
      "honeybook.api",
      "offline_access",
      "contacts.write",
      "projects.read",
      "projects.write",
      "workspaces.read",
      "workspaces.write",
    ],
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Probe: `GET /workspaces/any` -> `{ has_any: boolean }`. A tiny read with no
   * secret in the body. It needs `workspaces.read`, which a narrower grant may
   * lack — so the verdict comes from the vendor's `error_type`, not the status:
   * `HBInsufficientScopeError` means the token WAS accepted (reachability and
   * liveness proven), and only `HBInvalidJWTError` / a bare 401 is a dead token.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_BASE}/workspaces/any`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    const body = await res.json().catch(() => null) as
      | { has_any?: unknown; error_type?: string; error_message?: string }
      | null;

    if (res.ok) {
      return typeof body?.has_any === "boolean"
        ? { ok: true }
        : { ok: false, message: "HoneyBook answered 200 but not the documented { has_any } shape" };
    }
    if (body?.error_type === "HBInsufficientScopeError") {
      return {
        ok: true,
        message: "token accepted, but it was not granted workspaces.read",
      };
    }
    if (body?.error_type === "HBInvalidJWTError" || res.status === 401) {
      return {
        ok: false,
        message: "HoneyBook rejected the access token (missing, malformed or expired)",
      };
    }
    return {
      ok: false,
      message: `HoneyBook returned ${res.status}${body?.error_type ? ` ${body.error_type}` : ""}`,
    };
  },
};

export default oauth2;
