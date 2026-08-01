import type { AuthDefinition } from "@w6w/types";
import { fetchUserInfo } from "../lib/client.ts";

/**
 * Standard OAuth 2.0 — "Sign In with LinkedIn using OpenID Connect" +
 * "Share on LinkedIn". Both are free, self-serve LinkedIn Products: adding
 * them in the Developer Portal (My Apps -> Products) needs no review, so
 * this is the auth method that works for every LinkedIn Developer app on day
 * one. It grants `w_member_social` — posting as the *authenticated member*
 * only. For posting as an organization (company page) or reading
 * organization data, use `oauth2-community-management`, which needs
 * LinkedIn's Community Management API product (requires approval).
 *
 * client_id / client_secret / redirect_uri live on the w6w server
 * (PUT /apps/:id/oauth-config/oauth2), not in this package.
 *
 * Endpoints and scope names verified against LinkedIn's own docs (2026-07):
 *   - Authorization Code Flow: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 *   - Sign In with OpenID Connect: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
 *   - Share on LinkedIn (`w_member_social`): https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
 *
 * PKCE: LinkedIn's documented authorization/token requests carry only
 * response_type/client_id/redirect_uri/state/scope and
 * grant_type/code/client_id/client_secret/redirect_uri respectively — no
 * code_challenge/code_verifier anywhere, so PKCE is turned off explicitly
 * rather than left at the type default of `true`.
 *
 * Refresh: LinkedIn issues a 60-day access token and, for a standard app
 * like this one, NO refresh token — reconnecting means running the
 * authorization flow again (see the `oauth2-community-management` doc
 * comment for the partner-only exception). No custom `refresh` hook is
 * declared: there's nothing to refresh without a refresh token, and the
 * runtime's built-in refresh handler (POST to `tokenUrl`) is a no-op absent
 * one. Document this for connecting users rather than pretend otherwise.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with LinkedIn)",
  description:
    "Post as yourself and read your own profile. Requires a LinkedIn app with the free " +
    '"Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" products ' +
    "(no review needed). Access tokens last 60 days with no refresh token — reconnect when " +
    "it expires.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "email", "w_member_social"],
    scopeSeparator: " ",
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
    const res = await fetchUserInfo(ctx);
    if (!res.ok) return { ok: false, message: `LinkedIn returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await fetchUserInfo(ctx);
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as {
      sub?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    };
    return { user: { id: me.sub, name: me.name ?? [me.given_name, me.family_name].join(" ") } };
  },
};

export default oauth2;
