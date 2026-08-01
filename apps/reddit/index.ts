/**
 * Reddit — submit and read posts and comments, vote, search, and look up the
 * connected account's identity, against the OAuth-authenticated Reddit API
 * (`oauth.reddit.com`).
 *
 * Grounded against n8n's `Reddit.node.ts` for the operation set, then
 * verified endpoint-by-endpoint against Reddit's own
 * github.com/reddit-archive/reddit/wiki (2026-07-31). See README.md for the
 * auth flow, the mandatory User-Agent requirement, scopes, and declared
 * health checks.
 *
 * Deliberately out of scope, and why:
 *
 *   - **Post/comment deletion, editing, saving, subreddit subscription,
 *     moderation.** n8n's node covers post/comment delete; none of these
 *     were in this app's requested action set. Same shape as the actions
 *     here to add later (each needs its own scope: `edit` for delete/edit,
 *     `save` for saving, `subscribe` for subscribing).
 *   - **Recursive comment-tree walking.** `comment-list` returns only
 *     top-level comments — following nested `replies` (and Reddit's `more`
 *     continuation objects for deep threads) is a meaningfully bigger
 *     surface, left for a follow-up.
 *   - **Subreddit/user "about" lookups.** n8n also exposes a `subreddit`
 *     and `user` resource (about, rules, trending, karma, trophies, …);
 *     none of that was in this app's requested action set.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import postSubmit from "./actions/post-submit.ts";
import postGet from "./actions/post-get.ts";
import postList from "./actions/post-list.ts";
import postSearch from "./actions/post-search.ts";
import postVote from "./actions/post-vote.ts";
import commentList from "./actions/comment-list.ts";
import commentSubmit from "./actions/comment-submit.ts";
import identityGet from "./actions/identity-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // post
    postSubmit,
    postGet,
    postList,
    postSearch,
    postVote,
    // comment
    commentList,
    commentSubmit,
    // user
    identityGet,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
