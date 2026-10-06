/**
 * Podium — customer messaging, reviews, payments and phones — over the Podium
 * API v4 (`api.podium.com/v4`), authenticated with OAuth 2.
 *
 * Every path, verb, parameter and enum here was read from the OpenAPI document
 * Podium embeds in each page of docs.podium.com/reference (append `.md` to a
 * reference URL), plus live probes of `api.podium.com` and `status.podium.com`
 * on 2026-10-06. See README.md for the findings that shaped the design.
 */
import type { AppDefinition } from "@w6w/types";

import oauth2 from "./auth/oauth2.ts";

import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactTagAdd from "./actions/contact-tag-add.ts";
import contactTagRemove from "./actions/contact-tag-remove.ts";
import contactTagList from "./actions/contact-tag-list.ts";
import contactTagCreate from "./actions/contact-tag-create.ts";
import contactAttributeList from "./actions/contact-attribute-list.ts";
import contactAttributeCreate from "./actions/contact-attribute-create.ts";
import contactCampaignOptOut from "./actions/contact-campaign-opt-out.ts";
import contactTransactionalOptIn from "./actions/contact-transactional-opt-in.ts";
import contactTransactionalOptOut from "./actions/contact-transactional-opt-out.ts";
import conversationList from "./actions/conversation-list.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationUpdate from "./actions/conversation-update.ts";
import conversationNoteCreate from "./actions/conversation-note-create.ts";
import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";
import messageSend from "./actions/message-send.ts";
import locationList from "./actions/location-list.ts";
import locationGet from "./actions/location-get.ts";
import organizationGet from "./actions/organization-get.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import reviewList from "./actions/review-list.ts";
import reviewGet from "./actions/review-get.ts";
import reviewResponseCreate from "./actions/review-response-create.ts";
import reviewInviteCreate from "./actions/review-invite-create.ts";
import reviewInviteList from "./actions/review-invite-list.ts";
import reviewSummaryList from "./actions/review-summary-list.ts";
import feedbackList from "./actions/feedback-list.ts";
import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import appointmentCreate from "./actions/appointment-create.ts";
import appointmentList from "./actions/appointment-list.ts";
import appointmentGet from "./actions/appointment-get.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignMessageSend from "./actions/campaign-message-send.ts";
import templateList from "./actions/template-list.ts";
import dataFeedEventSend from "./actions/data-feed-event-send.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    contactCreate,
    contactGet,
    contactList,
    contactUpdate,
    contactDelete,
    contactTagAdd,
    contactTagRemove,
    contactTagList,
    contactTagCreate,
    contactAttributeList,
    contactAttributeCreate,
    contactCampaignOptOut,
    contactTransactionalOptIn,
    contactTransactionalOptOut,
    conversationList,
    conversationGet,
    conversationUpdate,
    conversationNoteCreate,
    messageList,
    messageGet,
    messageSend,
    locationList,
    locationGet,
    organizationGet,
    userList,
    userGet,
    reviewList,
    reviewGet,
    reviewResponseCreate,
    reviewInviteCreate,
    reviewInviteList,
    reviewSummaryList,
    feedbackList,
    callList,
    callGet,
    appointmentCreate,
    appointmentList,
    appointmentGet,
    campaignList,
    campaignGet,
    campaignCreate,
    campaignMessageSend,
    templateList,
    dataFeedEventSend,
    webhookCreate,
    webhookList,
    webhookGet,
    webhookUpdate,
    webhookDelete,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
