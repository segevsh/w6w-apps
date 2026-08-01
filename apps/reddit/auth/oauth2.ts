import type { AuthDefinition } from "@w6w/types";
import { API_URL, USER_AGENT } from "../lib/client.ts";

/**
 * OAuth 2.0 Authorization Code flow — Reddit's only supported user-context
 * auth. Endpoints per github.com/reddit-archive/reddit/wiki/OAuth2 (Reddit's
 * own repo, checked 2026-07-31):
 *
 *   - Authorize: `https://www.reddit.com/api/v1/authorize` (browser step)
 *   - Token:     `https://www.reddit.com/api/v1/access_token`
 *
 * Both are OAuth endpoint hosts, allowed implicitly — neither needs an entry
 * in `w6w.network.allow` (see build-a-w6w-app.md). Every signed request
 * after connecting goes to `oauth.reddit.com` (see `lib/client.ts`).
 *
 * `duration=permanent` is required at authorize time to get a refresh token
 * back at all — Reddit's default `duration=temporary` issues an access token
 * only (no `refresh_token` in the response), so it goes in `extraAuthParams`
 * rather than `scopes`. Renewal itself is the standard
 * `grant_type=refresh_token` request against the same token endpoint
 * (`refreshUrl` stated explicitly even though it equals `tokenUrl` and would
 * default to it, so the renewal path is visible without reading the spec).
 *
 * Reddit's documented flow authenticates the token endpoint with the app's
 * `client_id`/`client_secret` over HTTP Basic auth and never mentions PKCE
 * (no `code_challenge`/`code_verifier` anywhere in the wiki, and neither
 * n8n's nor PRAW's OAuth clients send one) — `pkce` is set to `false`
 * explicitly rather than left at the type's `true` default, the same call
 * this pack's Notion Auth makes for the same reason.
 *
 * Scopes are the minimum this app's actions need, not Reddit's full list
 * (which also has `edit`, `history`, `mysubreddits`, `save`, `subscribe`,
 * `flair`, `report`, `privatemessages`, `wikiread`/`wikiedit`,
 * `modconfig`/`modflair`/`modlog`/`modposts`/`modwiki` — none of which this
 * app's actions use):
 *
 *   - `identity` — `identity-get` (`GET /api/v1/me`)
 *   - `read`     — `post-get`, `post-list`, `comment-list`, `post-search`
 *   - `submit`   — `post-submit`, `comment-submit`
 *   - `vote`     — `post-vote`
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0 (Sign in with Reddit)",
  description:
    'Authorization Code flow. Requires a Reddit app (reddit.com/prefs/apps, type "web app") registered on this w6w installation.',
  connectionLabel: "u/{{user.name}}",
  oauth2: {
    authorizationUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    refreshUrl: "https://www.reddit.com/api/v1/access_token",
    scopes: ["identity", "read", "submit", "vote"],
    scopeSeparator: " ",
    pkce: false,
    extraAuthParams: { duration: "permanent" },
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    // Mandatory on every Reddit API call, not just this app's own actions —
    // the sign hook runs for arbitrary requests (including the runtime's own
    // probes), so make sure it's always set. See lib/client.ts#USER_AGENT.
    request.headers["user-agent"] = USER_AGENT;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/api/v1/me`, {
      headers: { authorization: `Bearer ${accessToken}`, "user-agent": USER_AGENT },
    });
    if (!res.ok) return { ok: false, message: `Reddit returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/api/v1/me`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as { name?: string; id?: string };
    return { user: body };
  },
};

export default oauth2;
