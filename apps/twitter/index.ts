/**
 * Twitter (X) — post, delete, search and read tweets, look up users, and
 * like/retweet, against the current X API v2 (`api.x.com`).
 *
 * Grounded against n8n's `Twitter.node.ts` (V2) for the operation set, then
 * verified endpoint-by-endpoint against docs.x.com (2026-07-31) since n8n's
 * port predates both the `api.x.com` rebrand and X's 2026 move to pay-per-use
 * pricing. See README.md for the auth flow, scopes, per-action tier/pricing
 * caveats, and declared health checks.
 *
 * Deliberately out of scope, and why:
 *
 *   - **Direct messages, Lists.** n8n's node covers both, but neither is in
 *     this app's requested action set; add them as a follow-up in the same
 *     shape as the tweet/user actions here.
 *   - **Multi-segment (large video) media upload.** `tweet-create`'s media
 *     path does a single-chunk INIT/APPEND/FINALIZE, which covers images and
 *     GIFs. A real multi-segment APPEND loop for large video is a
 *     meaningfully bigger surface (chunking, per-segment retry, longer
 *     `processing_info` polling) and is left for a follow-up.
 *   - **Full-archive tweet search.** `tweet-search-recent` only reaches the
 *     last 7 days, which is what `/2/tweets/search/recent` covers; the
 *     full-archive endpoint sits behind additional access this app does not
 *     assume.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import tweetCreate from "./actions/tweet-create.ts";
import tweetDelete from "./actions/tweet-delete.ts";
import tweetGet from "./actions/tweet-get.ts";
import tweetSearchRecent from "./actions/tweet-search-recent.ts";
import tweetLike from "./actions/tweet-like.ts";
import tweetRetweet from "./actions/tweet-retweet.ts";
import userGetByUsername from "./actions/user-get-by-username.ts";
import userGetTweets from "./actions/user-get-tweets.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // tweet
    tweetCreate,
    tweetDelete,
    tweetGet,
    tweetSearchRecent,
    tweetLike,
    tweetRetweet,
    // user
    userGetByUsername,
    userGetTweets,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
