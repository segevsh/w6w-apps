import type { AuthDefinition } from "@w6w/types";
import { API_URL, OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 — for acting on behalf of another Dropbox Sign user.
 *
 * **The endpoints are not where the spec puts them.** The official document
 * lists `/oauth/token` among its paths, which under its own
 * `servers: https://api.hellosign.com/v3` resolves to a URL that does not
 * exist. Both halves of the flow live on `app.hellosign.com`, outside `/v3`.
 * Measured 2026-08-18:
 *
 *   POST https://api.hellosign.com/v3/oauth/token -> 404 not_found
 *   POST https://app.hellosign.com/oauth/token    -> 400 invalid_request,
 *        "Either the combo client_id/code is wrong or this request was made
 *         more than 1 hour after the inital grant"
 *   GET  https://app.hellosign.com/oauth/authorize?client_id=… -> 200 (login)
 *
 * **Two more things the spec gets wrong about that endpoint**, both measured
 * the same day and both the kind that would strand a connection at "connect
 * failed" with no explanation:
 *
 *   - It declares the token request as `application/json`. The live endpoint
 *     parses **form-encoded** bodies — posting one omitting `client_id`
 *     answers `"Parameter client_id is missing"`, which it could only know by
 *     having read the form. So the ordinary OAuth2 client works.
 *   - It marks `state` **required** on the token request. It is not: omitting
 *     `state` produces the ordinary client_id/code error, while omitting
 *     `client_id` names that parameter specifically. `state` belongs to the
 *     authorize step, where the host already puts it.
 *
 * `refresh_token` grants work as standard — `grant_type=refresh_token` with a
 * bogus token answers `invalid_grant`, "Invalid grant data (refresh token)".
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth",
  description:
    "Connect a Dropbox Sign user's own account. Requires an API App registered in Dropbox " +
    "Sign, whose client id and secret are configured on this w6w installation.",
  connectionLabel: "{{accountEmail}}",

  oauth2: {
    authorizationUrl: OAUTH_AUTHORIZE_URL,
    tokenUrl: OAUTH_TOKEN_URL,
    refreshUrl: OAUTH_TOKEN_URL,
    // Every scope this app's actions actually use, and no more. `api_app_access`
    // is deliberately absent: managing API Apps is account administration, not
    // workflow, and this app ships no action for it.
    scopes: [
      "basic_account_info",
      "account_access",
      "request_signature",
      "signature_request_access",
      "template_access",
      "team_access",
    ],
    scopeSeparator: " ",
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}/account`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.status === 401) return { ok: false, message: "Dropbox Sign rejected the token (401)" };
    if (!res.ok) return { ok: false, message: `Dropbox Sign returned ${res.status}` };
    return { ok: true };
  },

  /** Publishes whose account was connected. Never the token. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as { credential: { accessToken?: string } };
    if (!credential.accessToken) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/account`, {
        headers: {
          authorization: `Bearer ${credential.accessToken}`,
          accept: "application/json",
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        account?: { email_address?: string; account_id?: string; is_paid_hs?: boolean };
      };
      return {
        accountEmail: body.account?.email_address,
        accountId: body.account?.account_id,
        paidSignPlan: body.account?.is_paid_hs,
      };
    } catch {
      return {};
    }
  },
};

export default oauth2;
