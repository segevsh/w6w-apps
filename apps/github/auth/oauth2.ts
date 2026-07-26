import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a GitHub App or OAuth App. The `client_id` / `client_secret` /
 * `redirect_uri` live on the w6w server (PUT /apps/:id/oauth-config/oauth2),
 * not in this package.
 *
 * GitHub's OAuth endpoints do not implement PKCE, so it is turned off
 * explicitly rather than left at the type default of `true`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with GitHub)",
  description:
    "Public OAuth flow. Requires a GitHub OAuth App or GitHub App registered on this w6w installation.",
  connectionLabel: "{{user.login}}",
  oauth2: {
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "read:org", "workflow"],
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
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return { ok: false, message: `GitHub returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: { accept: "application/vnd.github+json" },
    });
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as { id?: number; login?: string; name?: string };
    return { user: { id: me.id, login: me.login, name: me.name } };
  },
};

export default oauth2;
