import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0, Authorization Code grant — the only way to reach the V3 API.
 *
 * There is no API-key mode. Constant Contact's V3 API accepts a bearer JWT
 * minted by its authorization server and nothing else; the `x-api-key` scheme
 * that appears in the vendor's OpenAPI document is used by the *partner*
 * surface, not by a normal integration.
 *
 * Endpoints (verified live, 2026-08-03 — a GET to the authorize URL answers
 * 302 and a bare POST to the token URL answers a well-formed Okta error, so
 * both are real and reachable):
 *
 *   authorize  GET  https://authz.constantcontact.com/oauth2/default/v1/authorize
 *   token      POST https://authz.constantcontact.com/oauth2/default/v1/token
 *
 * The older `idfed.constantcontact.com/as/token.oauth2` host that some
 * third-party integrations still hardcode does **not** respond at all any more
 * (connection timeout). If a connection here fails at the token step, that is
 * the first thing to check.
 *
 * Scopes are exactly the five the vendor documents on its Authorization Scopes
 * page, minus the two this app has no use for:
 *
 *   - `contact_data`   — contacts, lists, custom fields, bulk activities.
 *   - `campaign_data`  — email campaigns and campaign activities.
 *   - `account_read`   — `GET /account/summary`.
 *   - `offline_access` — REQUIRED for a refresh token to be issued at all.
 *                        Without it the access token dies after 24 hours and
 *                        the user has to reconnect by hand.
 *   - `account_update` — deliberately NOT requested; no action here writes
 *                        account settings, and asking for write access this
 *                        app never uses is a needless ask on the consent
 *                        screen.
 *
 * `pkce: false`: Constant Contact publishes a separate PKCE flow for public
 * clients that cannot hold a secret. A w6w host is a confidential client — the
 * client secret lives server-side — so the plain Authorization Code flow is
 * the documented fit, and the refresh exchange it uses requires HTTP Basic
 * with `client_id:client_secret` anyway.
 *
 * Access tokens expire after 86,400 seconds (24 h); refresh tokens after 180
 * days if never used, and Constant Contact rotates the refresh token on every
 * exchange, so a host that stores only the original will find itself locked
 * out. The runtime's built-in refresh handles that; this app declares no
 * `refresh` hook of its own.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Constant Contact)",
  description:
    "Public OAuth flow. Requires a V3 API application registered on Constant Contact's developer portal (My Applications) and on this w6w installation.",
  connectionLabel: "{{account.organization_name}}",
  oauth2: {
    authorizationUrl: "https://authz.constantcontact.com/oauth2/default/v1/authorize",
    tokenUrl: "https://authz.constantcontact.com/oauth2/default/v1/token",
    scopes: [
      "contact_data",
      "campaign_data",
      "account_read",
      "offline_access",
    ],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Liveness probe: `GET /contacts?limit=1`.
   *
   * Not `/account/summary`, even though a whoami reads like the natural
   * choice — that endpoint needs `account_read`, which is the one scope in
   * this app's set a credential can legitimately be missing while every
   * contact and campaign action still works. Probing it would report a
   * perfectly good connection as broken. `/contacts` needs `contact_data`,
   * without which this app can do essentially nothing, so a failure there is
   * a failure worth reporting.
   *
   * 401 and 403 mean different things and are reported differently: 401 is a
   * dead or malformed token, 403 is a live token whose grant is too narrow.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/contacts?limit=1`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.status === 403) {
      return {
        ok: false,
        message:
          "Constant Contact returned 403 — the token is valid but was not granted the `contact_data` scope",
      };
    }
    if (!res.ok) return { ok: false, message: `Constant Contact returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Label the connection with the account it belongs to. Best-effort: this
   * needs `account_read`, and a connection granted only `contact_data` is
   * still perfectly usable, so a failure here returns `{}` rather than
   * failing the connect.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account/summary`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const account = await res.json().catch(() => ({})) as {
      organization_name?: string;
      contact_email?: string;
      encoded_account_id?: string;
    };
    return {
      account: {
        organization_name: account.organization_name,
        contact_email: account.contact_email,
        encoded_account_id: account.encoded_account_id,
      },
    };
  },
};

export default oauth2;
