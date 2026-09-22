import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX, apiDomainFromCredential } from "../lib/client.ts";
import { CURRENT_USER_PATH } from "../lib/users.ts";

/**
 * OAuth 2.0 (`oauth2`) — the only connect path Bigin offers. You register a
 * client in Zoho's API console (Server-based Applications, with Multi-DC
 * support enabled for the data centres you need), store the resulting
 * `client_id` / `client_secret` / `redirect_uri` on this w6w installation via
 * `PUT /apps/:id/oauth-config/oauth2`, and end users then connect through the
 * browser authorization dance.
 *
 * Bigin specifics, verified live 2026-09-22 against
 * https://www.bigin.com/developer/docs/apis/v2/multi-dc.html and the per-endpoint
 * pages under https://www.bigin.com/developer/docs/apis/v2/:
 *
 *   - **Authorization always starts at the US host** (`accounts.zoho.com`) for
 *     every data centre except China; Zoho's own exchange redirects the user to
 *     their home data centre. This method therefore wires the US
 *     authorization/token endpoints only, exactly like the `zoho` (Zoho CRM)
 *     sibling — an EU or Indian account still authorizes here and then talks to
 *     its own regional API host, which `afterConnect` records below. China is
 *     the documented exception (no redirection; the request has to start at
 *     `accounts.zoho.com.cn`), and enabling Multi-DC support for the client in
 *     Zoho's API console is a prerequisite for the other seven — both are
 *     called out in the README rather than special-cased here.
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response and the
 *     1-hour access token cannot be renewed.
 *   - **Three scopes, because the surface needs three.**
 *     `ZohoBigin.modules.ALL` covers create/read/update/delete/search on every
 *     module this app touches (Contacts, Accounts/Companies, Pipelines, Tasks);
 *     `ZohoBigin.users.ALL` covers the two user endpoints; and search needs
 *     `ZohoSearch.securesearch.READ` *in addition to* a modules scope — a
 *     second-scope rule that is easy to miss because every other endpoint needs
 *     only one.
 *   - The token response carries `api_domain` (e.g. `https://www.zohoapis.eu`)
 *     naming the API host that matches the account's data centre;
 *     `afterConnect` lifts it onto the connection's `display` so
 *     `lib/client.ts` addresses the right host per connection. Both the
 *     camelCase and snake_case spellings are accepted, the same defensive read
 *     the `zoho` sibling performs.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Zoho)",
  description:
    "Public OAuth flow. Requires a Zoho API console client (client_id / client_secret / redirect_uri) configured on this w6w installation, with Multi-DC support enabled for the data centres your tenants live in. Authorization starts at the US host for every region except China — see the README.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://accounts.zoho.com/oauth/v2/auth",
    tokenUrl: "https://accounts.zoho.com/oauth/v2/token",
    refreshUrl: "https://accounts.zoho.com/oauth/v2/token",
    scopes: [
      "ZohoBigin.modules.ALL",
      "ZohoBigin.users.ALL",
      "ZohoSearch.securesearch.READ",
    ],
    extraAuthParams: {
      // Without these Zoho omits the refresh token, and the connection dies
      // with the 1-hour access token.
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Zoho-oauthtoken ${accessToken}`;
    return request;
  },

  /**
   * `GET /users?type=CurrentUser` — the cheapest authenticated call Bigin
   * offers (one credit), needing only `ZohoBigin.users.READ`. Its body is the
   * *calling* user's own profile, not a copy of the credential, so it is safe
   * to use as a probe; no part of the profile is echoed into the result.
   *
   * Classified from the body's own machine-readable `code`, never from the HTTP
   * status alone — two different 401s mean two different things, both measured
   * live 2026-09-22:
   *
   *   - a token that reached the request but is not usable →
   *     `{"code":"INVALID_TOKEN","message":"invalid oauth token"}`;
   *   - no usable token on the request at all →
   *     `{"code":"AUTHENTICATION_FAILURE","message":"Authentication failed"}`.
   *
   * A 2xx is not taken on trust either: the response has to carry the
   * documented `users` array.
   */
  async test({ credential }, ctx) {
    const cred = credential as {
      accessToken?: string;
      apiDomain?: string;
      api_domain?: string;
    };
    const accessToken = (cred?.accessToken ?? "").trim();
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const domain = apiDomainFromCredential(cred);
    const res = await ctx.fetch(`${domain}${API_PREFIX}${CURRENT_USER_PATH}`, {
      headers: {
        accept: "application/json",
        authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    const body = await res.json().catch(() => null) as
      | { code?: string; message?: string; users?: unknown }
      | null;

    if (res.ok) {
      if (!Array.isArray(body?.users) || body.users.length === 0) {
        return {
          ok: false,
          message: "Bigin answered 200 without the documented `users` array for /users",
        };
      }
      return { ok: true };
    }

    switch (body?.code) {
      case "INVALID_TOKEN":
        return {
          ok: false,
          message: "Bigin rejected the access token (INVALID_TOKEN). Reconnect this connection.",
        };
      case "AUTHENTICATION_FAILURE":
        return {
          ok: false,
          message:
            "Bigin received no usable token (AUTHENTICATION_FAILURE) — the credential did not reach the request.",
        };
      case "OAUTH_SCOPE_MISMATCH":
        return {
          ok: false,
          message:
            "The token does not carry `ZohoBigin.users.READ` (OAUTH_SCOPE_MISMATCH) — reconnect and grant the users scope.",
        };
      case "AUTHORIZATION_FAILED":
        return {
          ok: false,
          message:
            "Bigin refused the request on privileges, not on the token (AUTHORIZATION_FAILED) — the account's plan or the user's profile may not allow it.",
        };
      case "NO_PERMISSION":
        return {
          ok: false,
          message: "Bigin denied access to the users endpoint (NO_PERMISSION).",
        };
      default:
        return {
          ok: false,
          message: `Bigin returned HTTP ${res.status}${
            body?.code ? ` (${body.code})` : ""
          } for ${CURRENT_USER_PATH}`,
        };
    }
  },

  /**
   * Records the resolved `apiDomain` on the connection so every later request
   * addresses the account's own data centre, and — best-effort — the calling
   * user's id and name so the connection carries a readable label.
   *
   * Bigin's documented API has no organization endpoint in this app's scope
   * (unlike Zoho CRM's `/org`), so the label is built from the same cheap
   * `type=CurrentUser` probe the `test` hook uses rather than from an org
   * record. A failure there must not fail an otherwise-good connection: `test`
   * has already proven the token works.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as {
      accessToken?: string;
      apiDomain?: string;
      api_domain?: string;
    };
    const raw = cred?.apiDomain ?? cred?.api_domain;
    if (!raw) return {};
    const domain = apiDomainFromCredential(cred);

    const accessToken = (cred?.accessToken ?? "").trim();
    if (!accessToken) return { apiDomain: domain };

    try {
      const res = await ctx.fetch(`${domain}${API_PREFIX}${CURRENT_USER_PATH}`, {
        headers: {
          accept: "application/json",
          authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });
      if (!res.ok) return { apiDomain: domain };
      const body = await res.json() as {
        users?: Array<{ id?: string; full_name?: string; email?: string }>;
      };
      const user = body.users?.[0];
      if (!user) return { apiDomain: domain };
      return {
        apiDomain: domain,
        user: { id: user.id, name: user.full_name ?? user.email },
      };
    } catch {
      return { apiDomain: domain };
    }
  },
};

export default oauth2;
