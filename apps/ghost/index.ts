import type { AppDefinition } from "@w6w/types";
import adminApiKey from "./auth/admin-api-key.ts";
import listPosts from "./actions/list-posts.ts";
import getPost from "./actions/get-post.ts";
import createPost from "./actions/create-post.ts";
import updatePost from "./actions/update-post.ts";
import deletePost from "./actions/delete-post.ts";
import listPages from "./actions/list-pages.ts";
import listMembers from "./actions/list-members.ts";
import createMember from "./actions/create-member.ts";
import listTags from "./actions/list-tags.ts";
import listTiers from "./actions/list-tiers.ts";
import getSiteInfo from "./actions/get-site-info.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    listPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    listPages,
    listMembers,
    createMember,
    listTags,
    listTiers,
    getSiteInfo,
  ],
  auth: [adminApiKey],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;
