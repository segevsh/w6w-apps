import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * OAuth 2.0 with a monday.com app. The client_id / client_secret / redirect_uri
 * live on the w6w server, not in this package.
 *
 * Unlike the personal API token, an OAuth access token IS sent with the
 * `Bearer` scheme. Scopes are space-separated in the authorization request
 * (monday returns them comma-separated in the token response, but that is the
 * server's concern, not the wire format we ask for).
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with monday.com)",
  description: "Public OAuth flow. Requires a monday.com app registered on this w6w installation.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://auth.monday.com/oauth2/authorize",
    tokenUrl: "https://auth.monday.com/oauth2/token",
    scopes: ["me:read", "boards:read", "boards:write"],
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
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "api-version": API_VERSION,
      },
      body: JSON.stringify({ query: "{ me { id name } }" }),
    });
    const body = await res.json().catch(() => ({})) as { errors?: Array<{ message?: string }> };
    if (!res.ok || body.errors?.length) {
      return { ok: false, message: body.errors?.[0]?.message ?? `monday returned ${res.status}` };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "api-version": API_VERSION },
      body: JSON.stringify({ query: "{ me { id name email } }" }),
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as { data?: { me?: unknown } };
    if (!body.data?.me) return {};
    return { user: body.data.me };
  },
};

export default oauth2;
