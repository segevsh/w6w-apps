import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, AUTHORIZE_URL, TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization-code flow — the only auth Podium documents
 * (docs.podium.com/reference/authentication: "The Podium API uses OAuth 2").
 *
 * Anyone can self-register at developer.podium.com: a developer account comes
 * with an app (`client_id` / `client_secret`) and free Podium test accounts.
 *
 * - Authorization: `GET https://api.podium.com/oauth/authorize` (302s to auth.podium.com).
 * - Token + refresh: `POST https://api.podium.com/oauth/token`. The docs show a
 *   JSON body; the endpoint also reads form-encoded bodies (measured: both
 *   shapes reach the same `unsupported_grant_type` / `invalid_client` errors).
 * - Access tokens last 10 hours; the refresh token is exchanged at the same URL.
 * - The redirect URI must be https and match the one registered on the app.
 */
export const SCOPES = [
  "read_contacts",
  "write_contacts",
  "read_messages",
  "write_messages",
  "read_locations",
  "write_locations",
  "read_organizations",
  "read_users",
  "read_reviews",
  "write_reviews",
  "read_feedback",
  "read_campaigns",
  "write_campaign_messages",
  "write_appointments",
  "write_data_feed_event",
  "read_payments",
  "write_payments",
];

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Podium)",
  description:
    "Authorization-code OAuth 2 against a Podium developer app (client_id / client_secret / " +
    "https redirect_uri from developer.podium.com) configured on this w6w installation.",
  connectionLabel: "Podium",
  oauth2: {
    authorizationUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    // Only the scopes in docs.podium.com/docs/oauth-scopes. More are named by
    // individual endpoints but absent from that table (see README).
    scopes: SCOPES,
    scopeSeparator: " ",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v4/webhooks` needs NO scope ("Required scope: none"), so it proves the
   * token without depending on which scopes the user granted, and its body is the
   * caller's own webhook list — never the token. Classified from the body's
   * `code`, with the status as a hint only.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/webhooks`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => null) as
      | { code?: string; message?: string }
      | null;
    if (body?.code === "unauthorized" || res.status === 401) {
      return { ok: false, message: `Podium rejected the token: ${body?.message ?? res.status}` };
    }
    return {
      ok: false,
      message: `Podium returned ${res.status}${body?.code ? ` ${body.code}` : ""}`,
    };
  },
};

export default oauth2;
