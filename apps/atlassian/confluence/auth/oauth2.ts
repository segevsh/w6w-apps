import type { AuthDefinition } from "@w6w/types";

/**
 * OAuth 2.0 (3LO) with an Atlassian app.
 *
 * OAuth connections do NOT talk to the site host. They go through Atlassian's
 * gateway at `api.atlassian.com/ex/confluence/{cloudId}`, and the cloud id has
 * to be resolved after the token is issued — `afterConnect` calls
 * `/oauth/token/accessible-resources` for it and records it on the connection,
 * which is what `lib/client.ts` reads. Same shape as the `jira` app, because
 * it is the same Atlassian identity platform.
 *
 * `offline_access` is in the scope list so a refresh token is issued; without
 * it the connection dies after an hour and cannot be used in scheduled runs.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Atlassian)",
  description:
    "Public OAuth flow. Requires an Atlassian OAuth 2.0 (3LO) app registered on this w6w " +
    "installation.",
  connectionLabel: "{{user.displayName}} ({{siteName}})",
  oauth2: {
    authorizationUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    refreshUrl: "https://auth.atlassian.com/oauth/token",
    scopes: [
      // Confluence's classic (non-granular) content scopes, the pair that
      // covers reading and writing pages, blog posts and comments.
      "read:confluence-content.all",
      "write:confluence-content",
      "read:confluence-space.summary",
      "read:confluence-user",
      // Without this Atlassian issues no refresh token and the connection
      // expires in an hour.
      "offline_access",
    ],
    extraAuthParams: { audience: "api.atlassian.com", prompt: "consent" },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Atlassian returned ${res.status}` };
    const sites = await res.json().catch(() => []) as unknown[];
    if (!Array.isArray(sites) || sites.length === 0) {
      return { ok: false, message: "the token grants access to no Atlassian site" };
    }
    return { ok: true };
  },

  /**
   * Resolves the cloud id. Only the FIRST accessible site is used — an app
   * granted several needs one Connection per site, which is the honest model
   * given a Connection carries a single cloud id.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch("https://api.atlassian.com/oauth/token/accessible-resources");
    if (!res.ok) return {};
    const sites = await res.json().catch(() => []) as Array<{
      id?: string;
      name?: string;
      url?: string;
    }>;
    const first = Array.isArray(sites) ? sites[0] : undefined;
    if (!first?.id) return {};

    const me = await ctx.fetch(
      `https://api.atlassian.com/ex/confluence/${first.id}/wiki/rest/api/user/current`,
    );
    const user = me.ok
      ? await me.json().catch(() => ({})) as { accountId?: string; displayName?: string }
      : {};
    return {
      cloudId: first.id,
      siteName: first.name,
      siteUrl: first.url,
      user: { id: user.accountId, displayName: user.displayName },
    };
  },
};

export default oauth2;
