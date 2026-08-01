/**
 * LinkedIn — w6w port of n8n's `LinkedIn` node (Posts API, `LinkedIn-Version: 202607`).
 *
 * LinkedIn's third-party API surface is deliberately narrow — most of
 * linkedin.com (feeds, connections, messaging, search, scraping of any kind)
 * has no public API at all, and what remains splits sharply by product
 * access:
 *
 *   - **Free, no review** ("Sign In with LinkedIn using OpenID Connect" +
 *     "Share on LinkedIn"): read your own profile, post/delete as yourself.
 *   - **Requires LinkedIn's approval** (Community Management API): post as
 *     an organization, list/read posts, look up organization info.
 *
 * That access split is why this app declares TWO oauth2 auth methods rather
 * than one broader one — see `auth/oauth2-community-management.ts` for why
 * bundling the scopes would break the free tier's connect flow entirely.
 *
 * Deliberately absent, and why:
 *   - **Image/video posts.** Requires uploading to a per-request presigned
 *     URL LinkedIn returns at call time (not `api.linkedin.com`), which a
 *     static `w6w.network.allow` can't declare in advance. See the doc
 *     comment on `actions/create-post.ts`.
 *   - **Post analytics/statistics.** `organizationalEntityShareStatistics`
 *     and friends sit behind LinkedIn's Advertising API / Marketing
 *     Developer Platform tier, a materially heavier approval bar than
 *     Community Management API — out of scope for this port rather than
 *     invented.
 *   - **Legacy `r_liteprofile` / `r_basicprofile`.** Deprecated by LinkedIn
 *     in favor of the OpenID Connect `profile` scope this app uses.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import oauth2CommunityManagement from "./auth/oauth2-community-management.ts";

import createPost from "./actions/create-post.ts";
import getPost from "./actions/get-post.ts";
import deletePost from "./actions/delete-post.ts";
import listPostsByAuthor from "./actions/list-posts-by-author.ts";
import getCurrentMemberProfile from "./actions/get-current-member-profile.ts";
import getOrganization from "./actions/get-organization.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  auth: [oauth2, oauth2CommunityManagement],
  actions: [
    // post
    createPost,
    getPost,
    deletePost,
    listPostsByAuthor,
    // profile / organization
    getCurrentMemberProfile,
    getOrganization,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
