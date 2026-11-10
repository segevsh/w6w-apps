import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import creatorAccessToken from "./auth/creator-access-token.ts";

// identity
import getIdentity from "./actions/get-identity.ts";

// campaign
import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";

// member
import listCampaignMembers from "./actions/list-campaign-members.ts";
import getMember from "./actions/get-member.ts";

// post
import listCampaignPosts from "./actions/list-campaign-posts.ts";
import getPost from "./actions/get-post.ts";

// webhook
import listWebhooks from "./actions/list-webhooks.ts";
import createWebhook from "./actions/create-webhook.ts";
import updateWebhook from "./actions/update-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";

import newPledge from "./triggers/new-pledge.ts";
import postPublished from "./triggers/post-published.ts";
import memberCreated from "./triggers/member-created.ts";
import memberUpdated from "./triggers/member-updated.ts";
import memberDeleted from "./triggers/member-deleted.ts";
import pledgeUpdated from "./triggers/pledge-updated.ts";
import pledgeDeleted from "./triggers/pledge-deleted.ts";
import postUpdated from "./triggers/post-updated.ts";
import postDeleted from "./triggers/post-deleted.ts";
import anyEvent from "./triggers/any-event.ts";
import newCampaign from "./triggers/new-campaign.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    getIdentity,
    listCampaigns,
    getCampaign,
    listCampaignMembers,
    getMember,
    listCampaignPosts,
    getPost,
    listWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
  ],
  triggers: [
    newPledge,
    postPublished,
    memberCreated,
    memberUpdated,
    memberDeleted,
    pledgeUpdated,
    pledgeDeleted,
    postUpdated,
    postDeleted,
    anyEvent,
    newCampaign,
  ],
  auth: [oauth2, creatorAccessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
