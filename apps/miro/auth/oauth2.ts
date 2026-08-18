import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (authorization code) — the **only** auth Miro's API offers. Its
 * OpenAPI document declares exactly one security scheme, `oAuth2AuthCode`,
 * with no API-key alternative, so this app has one auth method.
 *
 * Endpoints and scopes come from that scheme's own `authorizationCode` flow
 * block, and both were confirmed live on 2026-08-18:
 *
 *   GET  https://miro.com/oauth/authorize?response_type=code&client_id=test
 *        → 308 to the same URL with a trailing slash (a real endpoint
 *          normalising the path, not a catch-all)
 *   POST https://api.miro.com/v1/oauth/token
 *        → 401 {"status":401,"code":"tokenNotProvided",…} — Miro's own error
 *          envelope, i.e. the endpoint exists and is enforcing auth
 *
 * **Scopes.** The document lists nine; this app requests the two its actions
 * need. `boards:read` and `boards:write` cover every board, item, connector,
 * tag and member call here. The rest — `organizations:read`,
 * `microphone:listen`, `screen:record`, `webcam:record` and the other
 * enterprise/iframe scopes — belong to surfaces this app deliberately does not
 * implement, and asking for them would widen what every installing user has to
 * grant.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Miro)",
  description:
    "Public OAuth flow — the only auth Miro's API supports. Requires a Miro app registered " +
    "on this w6w installation.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://miro.com/oauth/authorize",
    tokenUrl: `${API_URL}/v1/oauth/token`,
    refreshUrl: `${API_URL}/v1/oauth/token`,
    scopes: ["boards:read", "boards:write"],
    scopeSeparator: " ",
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v1/oauth-token` is Miro's token-introspection endpoint — it takes no
   * board or team id and needs no board scope, so it proves the credential is
   * live without assuming the connection can already reach any particular
   * board. It also returns the granted scopes and the owning user, which is
   * what `afterConnect` records.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/v1/oauth-token`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.status === 401) return { ok: false, message: "Miro rejected the token (401)" };
    if (!res.ok) return { ok: false, message: `Miro returned ${res.status}` };
    return { ok: true };
  },

  /** Best-effort label data; a failure must not fail the connect flow. */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v1/oauth-token`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      user?: { id?: string; name?: string };
      team?: { id?: string; name?: string };
      organization?: { id?: string; name?: string };
      scopes?: string[];
    } | null;
    if (!body) return {};
    return {
      user: body.user,
      team: body.team,
      organization: body.organization,
      // Recorded so an operator can see what was actually granted, which is
      // often less than what was asked for.
      scopes: body.scopes,
    };
  },
};

export default oauth2;
