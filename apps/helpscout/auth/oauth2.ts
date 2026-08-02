import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * OAuth 2.0, Authorization Code grant (`oauth2`).
 *
 * Help Scout's Mailbox API implements two OAuth2 grants (verified against
 * developer.helpscout.com/mailbox-api/overview/authentication/) and its own
 * docs say which each is for: **"The Authorization Code flow is typically
 * used for integrations to be used by other Help Scout users. The Client
 * Credentials flow is meant for internal integrations."** A w6w App IS the
 * first case — one published integration, connected by many different
 * customers' Help Scout accounts — so Authorization Code is the fit, not
 * Client Credentials (PayPal's `type: "custom"` pattern, which this app does
 * NOT use).
 *
 * It also happens to be the cheaper implementation here: `type: "oauth2"`
 * gets the runtime's built-in authorization-code exchange and refresh for
 * free (no `exchange`/`refresh` hooks below, same as Zendesk/Asana), where
 * Client Credentials would need PayPal's hand-rolled `mintToken` + manual
 * `refresh` hook for no behavioural gain — Help Scout's own client-credentials
 * tokens still expire every 2 days and still need minting per app, just for
 * one account instead of per user.
 *
 * Unlike Freshdesk/Zendesk, there is no per-account host to collect as a
 * field: every customer's Mailbox API lives at the same `api.helpscout.net`,
 * confirmed by n8n's own `HelpScoutOAuth2Api.credentials.ts`, which hardcodes
 * the identical authorize/token URLs this app declares below.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Help Scout)",
  description:
    "Public OAuth flow. Requires an OAuth2 application registered under Your Profile → My Apps on Help Scout, and on this w6w installation.",
  connectionLabel: "{{user.firstName}} {{user.lastName}}",
  oauth2: {
    authorizationUrl: "https://secure.helpscout.net/authentication/authorizeClientApplication",
    tokenUrl: `${API_BASE}/oauth2/token`,
    // Help Scout's OAuth2 app registration carries no scope selection — the
    // token is authorized for everything the underlying user can do.
    scopes: [],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_BASE}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Help Scout returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/users/me`);
    if (!res.ok) return {};
    const user = await res.json().catch(() => ({})) as {
      id?: number;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  },
};

export default oauth2;
