import type { AuthDefinition } from "@w6w/types";
import { ACCEPT_HEADER, API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (classic user token, authorization-code grant). The `client_id` /
 * `client_secret` / `redirect_uri` live on the w6w server
 * (`PUT /apps/:id/oauth-config/oauth2`), not in this package.
 *
 * Endpoints and scope verified against PagerDuty's own credential source
 * (`PagerDutyOAuth2Api.credentials.ts` in n8n) and PagerDuty's developer docs
 * ("Obtaining a User OAuth Token via Code Grant" /
 * "...via PKCE" — both exist, so PKCE is supported and left at the type
 * default of `true`).
 *
 * `write` is PagerDuty's coarse classic scope; it implicitly includes read
 * access, matching what n8n's own OAuth2 credential requests and what every
 * action + auth check in this app needs.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with PagerDuty)",
  description:
    "Public OAuth flow. Requires a PagerDuty OAuth app registered on this w6w installation.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://app.pagerduty.com/oauth/authorize",
    tokenUrl: "https://app.pagerduty.com/oauth/token",
    scopes: ["write"],
    scopeSeparator: " ",
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/abilities`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: ACCEPT_HEADER },
    });
    if (!res.ok) return { ok: false, message: `PagerDuty returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken: string };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: ACCEPT_HEADER },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      user?: { id?: string; name?: string; email?: string };
    } | null;
    if (!body?.user) return {};
    return { user: { id: body.user.id, name: body.user.name, email: body.user.email } };
  },
};

export default oauth2;
