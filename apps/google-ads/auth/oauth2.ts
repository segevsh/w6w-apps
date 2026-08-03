import type { AuthDefinition } from "@w6w/types";
import { API_URL, buildGaql, normalizeCustomerId } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: this app's only API host is
 * `googleads.googleapis.com`, and allowing the generic Google API host would
 * widen the sandbox to every Google service for no reason. Composing the URN
 * from a named constant keeps that distinction explicit in the source rather
 * than leaving a bare URL literal that reads like an endpoint.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

interface Credential {
  accessToken?: string;
  developerToken?: string;
  customerId?: string;
  loginCustomerId?: string;
}

/**
 * OAuth 2.0 — the only interactive auth path Google offers for the Google Ads
 * API — plus three connection fields the API needs that OAuth alone cannot
 * supply.
 *
 * **Why the developer token is a connection field and not a manifest constant.**
 * Every Google Ads API request carries a `developer-token` header alongside the
 * bearer. That token is issued to a *specific Google Ads manager account* under
 * a specific API Center application, and Google gates it: a freshly issued
 * token has **Test Account access** and can only touch test accounts; reaching
 * real accounts needs Basic or Standard access, which is an application Google
 * reviews. It is therefore the connecting organisation's credential, not this
 * app's, and hardcoding one would be both wrong and a leak. It is collected as
 * a `secret` field and stamped in `sign`, exactly like the bearer.
 *
 * **`login-customer-id`.** When the OAuth user authorises as a *manager*
 * account acting on behalf of a client account, Google requires the manager's
 * customer id in a `login-customer-id` header; when the credential belongs to a
 * user of the target account directly, the header must be omitted. So it is an
 * optional field, and `sign` sets the header only when it is present — sending
 * an empty one is not the same as sending none.
 *
 * **`customerId`.** The account a call is addressed to is a path segment, so
 * unlike the two above it has to be visible to actions. It travels via
 * `afterConnect` onto the Connection's redacted `display` (the pattern
 * QuickBooks uses for `realmId`), and each action can override it — one grant
 * commonly reaches several accounts under the same manager.
 *
 * Google requires `access_type=offline` + `prompt=consent` on the authorize URL
 * to reliably hand back a refresh token.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Google Ads API enabled, OAuth client credentials configured on this w6w installation, and a Google Ads developer token.",
  connectionLabel: "{{descriptiveName}} ({{customerId}})",
  fields: [
    {
      key: "developerToken",
      label: "Developer token",
      type: "secret",
      required: true,
      hint:
        "From your Google Ads manager account: Tools & Settings → Setup → API Center. A new token has Test Account access only; Basic or Standard access to reach live accounts is an application Google reviews.",
    },
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint:
        "The Google Ads account these actions default to, shown top-right in the Google Ads UI. Dashes are fine.",
      placeholder: "123-456-7890",
      validation: { pattern: "^[0-9][0-9-]*[0-9]$" },
    },
    {
      key: "loginCustomerId",
      label: "Manager (login) customer ID",
      type: "string",
      hint:
        "Only when authorising as a manager account acting on a client account — sent as `login-customer-id`. Leave blank if the credential belongs to a user of the target account directly.",
      placeholder: "123-456-7890",
      validation: { pattern: "^[0-9-]*$" },
    },
  ],
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    // Google documents exactly one scope for this API. There is no read-only
    // variant to fall back to.
    scopes: [scope("adwords")],
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  /**
   * The only hook handed the credential. It stamps all three header-borne
   * secrets and returns; it never reaches the network.
   *
   * `login-customer-id` is set *only* when one was supplied: Google's docs are
   * explicit that a non-manager credential should not send the header at all,
   * and an empty value is a 400, not a no-op.
   */
  sign({ request, credential }) {
    const { accessToken, developerToken, loginCustomerId } = credential as Credential;
    request.headers["authorization"] = `Bearer ${accessToken}`;
    if (developerToken) request.headers["developer-token"] = developerToken;
    if (loginCustomerId) {
      request.headers["login-customer-id"] = normalizeCustomerId(
        loginCustomerId,
        "loginCustomerId",
      );
    }
    return request;
  },

  /**
   * `customers.listAccessibleCustomers` is the right liveness probe here: it is
   * the one Google Ads endpoint that takes no customer id, needs no manager
   * context, and is reachable by the single scope this app holds — so it proves
   * the bearer *and* the developer token without assuming the connection's
   * `customerId` is already correct. An account with nothing accessible still
   * answers 200.
   */
  async test({ credential }, ctx) {
    const { accessToken, developerToken, loginCustomerId } = credential as Credential;
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    if (!developerToken) return { ok: false, message: "credential missing developerToken" };

    const headers: Record<string, string> = {
      authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      accept: "application/json",
    };
    if (loginCustomerId) {
      headers["login-customer-id"] = normalizeCustomerId(loginCustomerId, "loginCustomerId");
    }

    const res = await ctx.fetch(`${API_URL}/customers:listAccessibleCustomers`, { headers });
    if (!res.ok) return { ok: false, message: `Google Ads returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the account this connection is for, so actions can build
   * `customers/{id}/…` paths without ever seeing a credential, and labels it
   * with the account's own descriptive name.
   *
   * The name lookup is a GAQL read against `customer` — this API has no whoami
   * and no per-resource GET, so a query is the only way to ask. It is
   * best-effort: a token that cannot read the account still yields a usable
   * connection carrying `customerId`, just with a plainer label.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken, developerToken, customerId, loginCustomerId } = credential as Credential;
    if (!customerId) return {};
    const id = normalizeCustomerId(customerId, "customerId");
    const display: Record<string, unknown> = { customerId: id };
    if (loginCustomerId) {
      display.loginCustomerId = normalizeCustomerId(loginCustomerId, "loginCustomerId");
    }
    if (!accessToken || !developerToken) return display;

    const headers: Record<string, string> = {
      authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      accept: "application/json",
      "content-type": "application/json",
    };
    if (display.loginCustomerId) {
      headers["login-customer-id"] = String(display.loginCustomerId);
    }

    const query = buildGaql({
      select: [
        "customer.id",
        "customer.descriptive_name",
        "customer.currency_code",
        "customer.time_zone",
        "customer.manager",
        "customer.test_account",
      ],
      from: "customer",
      limit: 1,
    });
    const res = await ctx.fetch(`${API_URL}/customers/${id}/googleAds:search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return display;

    const body = await res.json().catch(() => ({})) as {
      results?: Array<{
        customer?: {
          descriptiveName?: string;
          currencyCode?: string;
          timeZone?: string;
          manager?: boolean;
          testAccount?: boolean;
        };
      }>;
    };
    const customer = body.results?.[0]?.customer;
    if (!customer) return display;
    return {
      ...display,
      descriptiveName: customer.descriptiveName,
      currencyCode: customer.currencyCode,
      timeZone: customer.timeZone,
      manager: customer.manager,
      testAccount: customer.testAccount,
    };
  },
};

export default oauth2;
