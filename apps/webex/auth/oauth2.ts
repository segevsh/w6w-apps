import type { AuthDefinition } from "@w6w/types";
import { API_BASE, OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization-code grant, via a Webex Integration
 * (developer.webex.com > My Webex Apps > Create an Integration).
 *
 * Verified on 2026-09-29 against `developer.webex.com/docs/integrations`:
 * `POST https://webexapis.com/v1/access_token` (form-encoded,
 * `grant_type=authorization_code`) exchanges the code, and the same endpoint
 * with `grant_type=refresh_token` renews it. An access token lasts 14 days,
 * a refresh token 90 — both event-driven ("use the expiration values
 * returned by the service rather than assuming a fixed lifetime"), so this
 * declares `refreshUrl` and lets the host renew on expiry rather than on a
 * fixed schedule.
 *
 * PKCE is documented for a *separate* flow ("Login with Webex" — public
 * clients, device-code, OIDC) and is not part of the confidential-client
 * Integration flow this Auth targets, so `pkce` is left unset rather than
 * guessed onto a flow that requires a client secret regardless.
 *
 * Scopes are the minimum needed for every resource this app's Actions touch —
 * People is read-only (Webex's own guidance: use SCIM 2.0 for writes), so no
 * `people_write` scope is requested.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Webex)",
  description:
    "Register an Integration at developer.webex.com > My Webex Apps, then connect with its " +
    "Client ID and Client Secret.",
  connectionLabel: "{{user.email}}",
  oauth2: {
    authorizationUrl: OAUTH_AUTHORIZE_URL,
    tokenUrl: OAUTH_TOKEN_URL,
    refreshUrl: OAUTH_TOKEN_URL,
    scopes: [
      "spark:people_read",
      "spark:rooms_read",
      "spark:rooms_write",
      "spark:messages_read",
      "spark:messages_write",
      "spark:memberships_read",
      "spark:memberships_write",
      "spark:teams_read",
      "spark:teams_write",
      "spark:team_memberships_read",
      "spark:team_memberships_write",
      "spark:webhooks_read",
      "spark:webhooks_write",
    ],
  },

  /** The only hook given the raw credential. Network-less: stamps and returns. */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /people/me` — the vendor's own reference entry point, needs only the
   * base `spark:people_read` scope every Integration above carries, and
   * returns no credential material. Classified from the response body, never
   * the status code alone: an unauthenticated or invalid-token call answers
   * `401 {"message": "The request requires a valid access token set in the
   * Authorization request header.", "errors": [...], "trackingId": "..."}`,
   * confirmed live on 2026-09-29 — the message never echoes the token itself.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}/people/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string } | null;
    if (res.status === 401) {
      return {
        ok: false,
        message: body?.message ??
          "Webex rejected the access token. Reconnect this connection.",
      };
    }
    return {
      ok: false,
      message: body?.message ?? `Webex returned HTTP ${res.status} for GET /people/me`,
    };
  },

  /**
   * Publish the connected person's email and display name for the Connection
   * label. A failure here is deliberately silent — `test` already proved the
   * token live, and a missing label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}/people/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return {};
      const me = await res.json() as { id?: string; emails?: string[]; displayName?: string };
      const email = me.emails?.[0];
      if (!email) return {};
      return { user: { id: me.id, email, name: me.displayName } };
    } catch {
      return {};
    }
  },
};

export default oauth2;
