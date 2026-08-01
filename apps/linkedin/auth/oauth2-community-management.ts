import type { AuthDefinition } from "@w6w/types";
import { fetchUserInfo } from "../lib/client.ts";

/**
 * OAuth 2.0 via LinkedIn's Community Management API product — required for
 * anything touching an organization (company page): posting as one, reading
 * its posts, or looking up its profile. This product needs LinkedIn's
 * review/approval; a developer app without it cannot request these scopes.
 *
 * Two auth methods exist rather than one with a broader scope list because
 * LinkedIn's authorization endpoint rejects the ENTIRE request if any
 * requested scope isn't granted to the app (`unauthorized_scope_error`) —
 * bundling org scopes into the default method would break connecting for
 * every app that only has the free "Share on LinkedIn" product. This mirrors
 * how n8n splits `linkedInOAuth2Api` from
 * `linkedInCommunityManagementOAuth2Api`.
 *
 * `rw_organization_admin` (needed by the `get-organization` action's
 * admin-fields lookup) is bundled in here too, on the same reasoning: an app
 * that already cleared Community Management review is the one positioned to
 * also request organization-admin access, and splitting it into a third auth
 * method would multiply this problem rather than solve it.
 *
 * Verified against LinkedIn's docs (2026-07):
 *   - Posts API permissions table (w_organization_social / r_organization_social):
 *     https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 *   - Organization Lookup permissions (rw_organization_admin):
 *     https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api
 *
 * Refresh: LinkedIn issues *programmatic* refresh tokens (access token 60
 * days, refresh token ~1 year) only to apps LinkedIn has separately approved
 * for the Marketing Developer Platform program — Community Management API
 * access alone does not guarantee it. When a refresh token IS present in the
 * stored credential, no custom `refresh` hook is needed: the runtime's
 * built-in handler renews it against `tokenUrl` with the standard
 * `grant_type=refresh_token` exchange. When it isn't, there's nothing to
 * refresh and reconnecting is the only path — same as the standard method.
 */
const oauth2CommunityManagement: AuthDefinition = {
  key: "oauth2-community-management",
  type: "oauth2",
  displayName: "OAuth (Community Management)",
  description: "Post as an organization (company page) and look up organization info. Requires a " +
    "LinkedIn app approved for the Community Management API product — the authorization " +
    "request fails outright if your app hasn't been granted these scopes.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: [
      "openid",
      "profile",
      "email",
      "w_member_social",
      "w_organization_social",
      "r_organization_social",
      "rw_organization_admin",
    ],
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

export default oauth2CommunityManagement;
