import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a Linear OAuth application. The client_id / client_secret /
 * redirect_uri live on the w6w server, not in this package.
 *
 * Unlike the personal API key, an OAuth access token IS sent with the `Bearer`
 * scheme — Linear accepts both forms, one per credential type.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Linear)",
  description:
    "Public OAuth flow. Requires a Linear OAuth application registered on this w6w installation.",
  connectionLabel: "{{user.name}} ({{organization.name}})",
  oauth2: {
    authorizationUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    scopes: ["read", "write", "issues:create", "comments:create"],
    scopeSeparator: ",",
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
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: "{ viewer { id } }" }),
    });
    const body = await res.json().catch(() => ({})) as { errors?: Array<{ message?: string }> };
    if (!res.ok || body.errors?.length) {
      return { ok: false, message: body.errors?.[0]?.message ?? `Linear returned ${res.status}` };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "{ viewer { id name email } organization { id name urlKey } }",
      }),
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { viewer?: unknown; organization?: unknown };
    };
    if (!body.data) return {};
    return { user: body.data.viewer ?? {}, organization: body.data.organization ?? {} };
  },
};

export default oauth2;
