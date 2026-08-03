import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API key — public, read-only data with no user account attached.
 *
 * Google's authentication guide draws the line explicitly: an API key identifies
 * the *project*, not a user, so it can read anything already public on YouTube
 * and can do nothing else. That is a genuinely useful posture for this app —
 * `search`, `get-videos`, `get-channels`, `list-playlists`, `list-playlist-items`
 * and `list-comment-threads` against public resources all work with nothing but
 * a key, and no consent screen or refresh-token plumbing is involved.
 *
 * **What it cannot do**, stated plainly so nobody debugs a 401 for an hour:
 *
 *   - Any `mine=true` / `forMine=true` filter. There is no "me" behind a key.
 *   - Every write: `update-video`, `delete-video`, `rate-video`,
 *     `create-playlist`, `update-playlist`, `delete-playlist`,
 *     `add-playlist-item`, `remove-playlist-item`, `reply-to-comment`.
 *   - `list-subscriptions`, which has no unauthenticated form.
 *   - Private or unlisted resources of any kind.
 *
 * Those calls return 401 `unauthorized` or 403 `forbidden`. Connect the `oauth2`
 * method for them.
 *
 * **Why it fits the AuthDefinition contract cleanly.** Google takes the key as a
 * `key` query parameter, and `ApiKeyConfig` models exactly that with
 * `{ in: "query", name: "key" }`; `SignableRequest.url` is mutable, so `sign`
 * mirrors the same wiring for hosts and tests that call `sign()` directly. No
 * custom flow, no exchange step, nothing bent to fit.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key (public data, read-only)",
  description:
    "A YouTube Data API v3 key from the Google Cloud Console (APIs & Services → Credentials). Reads public data only — no writes, no `mine=true`, no private resources. Travels as the `key` query parameter.",
  apiKey: { in: "query", name: "key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Google Cloud Console → APIs & Services → Credentials → Create credentials → API key, in a project with the YouTube Data API v3 enabled.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const url = new URL(request.url);
    url.searchParams.set("key", apiKey);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    // `i18nLanguages.list` is the right probe for a key: it costs 1 unit, it is
    // fully public so it needs no scope and no channel, and it returns a
    // non-empty result for every valid key — so an empty response is a real
    // signal rather than an empty account. The OAuth method's `channels.list?
    // mine=true` probe would 401 here, which is exactly why the two methods do
    // not share one.
    const url = new URL(`${API_URL}/i18nLanguages`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("key", apiKey);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) return { ok: false, message: `YouTube returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
