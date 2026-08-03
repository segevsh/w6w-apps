/**
 * OAuth 2.0 authorization-code flow against TickTick's Open API.
 *
 * https://developer.ticktick.com/docs/openapi.md — "Authorization"
 *
 * You register an application at the TickTick Developer Center
 * (<https://developer.ticktick.com/manage>), which issues a `client_id` +
 * `client_secret` and takes a redirect URL. Those go on the w6w server via
 * `PUT /apps/:id/oauth-config/oauth2`. End users then connect through the
 * browser authorization dance.
 *
 * ## Scopes — the complete list, not a selection
 *
 * TickTick documents **two** scopes and no others: `tasks:read` and
 * `tasks:write`, space-separated. Both are requested, because this App both
 * reads and writes and there is no finer grain on offer.
 *
 * The honest caveat, stated rather than hidden: TickTick's Focus and Habit
 * endpoints are documented in the same Open API reference, under the same
 * `Authorization: Bearer` scheme, but the Authorization section still lists only
 * the two `tasks:*` scopes. TickTick publishes no scope-to-endpoint table, so
 * whether those endpoints are covered by `tasks:read`/`tasks:write` or by a
 * scope that simply is not documented yet **cannot be verified from the docs**.
 * They are shipped because the vendor documents them; if a Focus or Habit action
 * answers `403` on a connection whose task actions work, that is the answer.
 *
 * ## Three flow details that differ from the usual
 *
 *  1. **Client credentials go in the `Authorization: Basic` header.** TickTick's
 *     token-exchange table says so in as many words: "The username is located in
 *     the **HEADER** using the **Basic Auth** authentication method". The w6w
 *     host's generic exchange (`packages/server/packages/api/oauth-flow.ts`)
 *     sends `client_id` / `client_secret` in the form body instead — the
 *     RFC 6749 `client_secret_post` form. Whether TickTick's token endpoint also
 *     accepts that form could not be determined without a real client: probed on
 *     2026-08-03, `POST https://ticktick.com/oauth/token` answers an identical
 *     Tomcat `401` HTML page for bogus credentials in *either* position, so the
 *     two cases are indistinguishable from outside. If connecting fails at the
 *     exchange step, this is the first thing to look at, and an `exchange` hook
 *     is the documented extension point.
 *
 *  2. **No refresh is documented.** The token-exchange table says `grant_type`
 *     is "now only authorization_code" — there is no `refresh_token` grant, no
 *     `refresh_url`, and no documented `refresh_token` in the response. So no
 *     `refresh` hook is declared: a hook that guessed at an undocumented grant
 *     would fail at exactly the moment it was needed. If TickTick does return a
 *     `refresh_token`, the host stores it (`oauth-flow.ts` reads the standard
 *     field) and it is available the day a grant is documented. Until then,
 *     **re-authorising is the recovery path** for an expired connection.
 *
 *  3. **No PKCE.** TickTick documents neither `code_challenge` nor
 *     `code_challenge_method`, so `pkce` is set to `false` rather than left at
 *     the spec default of `true`. (The w6w host does not currently implement the
 *     PKCE leg either, so this is a statement of fact about the vendor rather
 *     than a behaviour change.)
 *
 * ## No `afterConnect`
 *
 * The Open API exposes no user, profile or account endpoint — there is nothing
 * to read a name or email from — so there is no `afterConnect` hook and no
 * `connectionLabel` template. A label that interpolated variables nobody sets
 * would render as literal `{{user.name}}`.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export const AUTHORIZATION_URL = "https://ticktick.com/oauth/authorize";
export const TOKEN_URL = "https://ticktick.com/oauth/token";

/** The complete documented scope list. There is no third scope. */
export const SCOPES = ["tasks:read", "tasks:write"];

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with TickTick)",
  description:
    "Public OAuth flow. Requires a TickTick Developer Center app registration (client_id / client_secret / redirect_uri) configured on this w6w installation. TickTick documents no refresh grant, so an expired token means re-authorising.",
  oauth2: {
    authorizationUrl: AUTHORIZATION_URL,
    tokenUrl: TOKEN_URL,
    scopes: SCOPES,
    // Space-separated, which is the spec default — restated because TickTick's
    // own doc spells the scope value "tasks: write, tasks: read" in one table
    // and "tasks:write tasks:read" in another. The latter is the correct one.
    scopeSeparator: " ",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /open/v1/project` — the smallest documented read in the whole API.
   *
   * It takes no parameters, returns a bare array, and needs only `tasks:read`,
   * which every connection to this App holds. There is no cheaper probe: TickTick
   * has no `/me`, no token-introspection endpoint, and every other read needs an
   * id the probe would have to invent.
   *
   * The failure message reports the HTTP status and nothing else — never the
   * token, and never the vendor's `error_description`, which echoes the token
   * back verbatim (`"Invalid access token: <token>"`, confirmed on the wire
   * 2026-08-03). That echo is exactly why this does not reuse the client's
   * `describeFailure`.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/project`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `TickTick returned ${res.status}` };
    return { ok: true };
  },
};

export default oauth2;
