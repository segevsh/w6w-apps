import type { AuthDefinition } from "@w6w/types";
import { resolveApiBase } from "../lib/client.ts";

/**
 * OAuth 2.0 (authorization code) against GitLab.com. The `client_id` /
 * `client_secret` / `redirect_uri` live on the w6w server
 * (PUT /apps/:id/oauth-config/oauth2), not in this package.
 *
 * GitLab issues a normal Bearer token from this flow, so — unlike the access
 * token method — `sign` sets `Authorization: Bearer <token>`.
 *
 * Scope note: `api` is GitLab's full read/write API scope, which every action
 * here needs. The authorization/token endpoints are GitLab.com's; a
 * self-managed instance runs its own OAuth server, so target that with the
 * access-token method (its `baseUrl` field) rather than this one.
 *
 * PKCE is turned off explicitly: w6w holds the confidential app's
 * `client_secret` server-side, and GitLab accepts authorization_code +
 * client_secret without a code challenge.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with GitLab)",
  description:
    "Public OAuth flow against GitLab.com. Requires a GitLab application registered on this w6w installation.",
  connectionLabel: "{{user.username}}",
  oauth2: {
    authorizationUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    scopes: ["api"],
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
    const res = await ctx.fetch(`${resolveApiBase()}/user`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `GitLab returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${resolveApiBase()}/user`);
    let user: { id?: number; username?: string; name?: string } = {};
    if (res.ok) {
      user = await res.json().catch(() => ({})) as typeof user;
    }
    return {
      baseUrl: "https://gitlab.com",
      user: { id: user.id, username: user.username, name: user.name },
    };
  },
};

export default oauth2;
