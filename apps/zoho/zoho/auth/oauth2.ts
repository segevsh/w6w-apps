import type { AuthDefinition } from "@w6w/types";
import { API_VERSION, DEFAULT_API_DOMAIN } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the only connect path Zoho CRM offers (it has no
 * long-lived personal-access-token style credential; the closest, a
 * "self-client" grant, is still an OAuth2 code exchange under the hood). You
 * register a Zoho API console client (Server-based Applications), store the
 * resulting `client_id` / `client_secret` / `redirect_uri` on the w6w server
 * via `PUT /apps/:id/oauth-config/oauth2`, and end users then connect via the
 * browser authorization dance.
 *
 * Zoho specifics:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response and the
 *     access token (1 hour lifetime) cannot be renewed.
 *   - `ZohoCRM.modules.ALL` covers create/read/update/delete/search/convert on
 *     every module this app touches (Leads, Contacts, Deals, Accounts, Tasks,
 *     Notes). `ZohoCRM.org.READ` is the scope the `test` hook and the `quota`
 *     health check probe with — the cheapest authenticated call Zoho offers.
 *   - **US data centre only.** Zoho hosts accounts in one of several regional
 *     data centres, each with its own `accounts.zoho.<tld>` authorization/
 *     token host (`accounts.zoho.eu`, `.in`, `.com.au`, `.jp`, `.com.cn`,
 *     `accounts.zohocloud.ca`, `accounts.zoho.sa`). This method only offers
 *     the US host (`accounts.zoho.com`); an EU/IN/AU/JP/CN/CA/SA-hosted
 *     account cannot complete this authorization flow at all — see the
 *     README's "Regional accounts" section.
 *   - The token response carries `api_domain` (e.g. `https://www.zohoapis.com`)
 *     — the API host that matches the org's data centre. `afterConnect` lifts
 *     it onto the connection's `display` so `lib/client.ts` addresses the
 *     right host per connection, mirroring how Salesforce's `instance_url`
 *     is handled in this pack's `salesforce` app.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Zoho)",
  description:
    "Public OAuth flow. Requires a Zoho API console client (client_id / client_secret / redirect_uri) configured on this w6w installation. US data centre accounts only — see the README.",
  connectionLabel: "{{org.name}}",
  oauth2: {
    authorizationUrl: "https://accounts.zoho.com/oauth/v2/auth",
    tokenUrl: "https://accounts.zoho.com/oauth/v2/token",
    refreshUrl: "https://accounts.zoho.com/oauth/v2/token",
    scopes: ["ZohoCRM.modules.ALL", "ZohoCRM.org.READ"],
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

  async test({ credential }, ctx) {
    const cred = credential as { accessToken?: string; apiDomain?: string; api_domain?: string };
    if (!cred.accessToken) return { ok: false, message: "credential missing accessToken" };
    const domain = (cred.apiDomain ?? cred.api_domain ?? DEFAULT_API_DOMAIN).replace(/\/+$/, "");
    const res = await ctx.fetch(`${domain}/crm/${API_VERSION}/org`, {
      headers: { authorization: `Zoho-oauthtoken ${cred.accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Zoho CRM returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Zoho's token response names the field `api_domain`; a host that
   * camel-cases response fields would produce `apiDomain`. Both are accepted
   * rather than betting on one, same as Salesforce's `instance_url` handling.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as { accessToken?: string; apiDomain?: string; api_domain?: string };
    const domain = (cred.apiDomain ?? cred.api_domain)?.replace(/\/+$/, "");
    if (!domain) return {};

    const res = await ctx.fetch(`${domain}/crm/${API_VERSION}/org`);
    if (!res.ok) return { apiDomain: domain };
    const body = await res.json().catch(() => ({})) as {
      org?: Array<{ id?: string; company_name?: string }>;
    };
    const org = body.org?.[0];
    return {
      apiDomain: domain,
      org: { id: org?.id, name: org?.company_name ?? new URL(domain).hostname },
    };
  },
};

export default oauth2;
