/**
 * Facebook Pages — generic Facebook Graph API access: Pages, posts, comments,
 * photos, videos, Page insights, and read-only ad-account campaign listing.
 *
 * Distinct from `facebook-lead-ads` (packages/apps/apps/facebook-lead-ads),
 * which covers only the Lead Ads surface (`{page_id}/leadgen_forms`,
 * `{form_id}/leads`). This app deliberately does NOT touch that surface —
 * see README.md "Relationship to facebook-lead-ads".
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import pageToken from "./auth/page-token.ts";
import listPages from "./actions/list-pages.ts";
import getPage from "./actions/get-page.ts";
import listPosts from "./actions/list-posts.ts";
import createPost from "./actions/create-post.ts";
import getPost from "./actions/get-post.ts";
import deletePost from "./actions/delete-post.ts";
import listComments from "./actions/list-comments.ts";
import createComment from "./actions/create-comment.ts";
import deleteComment from "./actions/delete-comment.ts";
import listPhotos from "./actions/list-photos.ts";
import uploadPhoto from "./actions/upload-photo.ts";
import listVideos from "./actions/list-videos.ts";
import getPageInsights from "./actions/get-page-insights.ts";
import listAdCampaigns from "./actions/list-ad-campaigns.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listPages,
    getPage,
    listPosts,
    createPost,
    getPost,
    deletePost,
    listComments,
    createComment,
    deleteComment,
    listPhotos,
    uploadPhoto,
    listVideos,
    getPageInsights,
    listAdCampaigns,
  ],
  auth: [oauth2, pageToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
