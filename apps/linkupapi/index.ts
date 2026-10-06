/**
 * LinkupAPI — one API for LinkedIn, WhatsApp and email outreach, sourcing and enrichment,
 * over the V2 API at `api.linkupapi.com`. This is NOT Linkup (linkup.so), the web-search API
 * that ships as the `linkup` app.
 *
 * Every endpoint, verb, action name and field here comes from the V2 reference pages
 * (`docs.linkupapi.com/api-reference/v2/**`, indexed by `llms.txt`) and was probed on
 * 2026-10-06 against `api.linkupapi.com`: every path answers a JSON `INVALID_API_KEY` 403 to a
 * bad key. No real account was available, so response shapes are the documented ones.
 *
 * Findings that shaped the design:
 *
 *  1. **The published OpenAPI is V1.** `docs.linkupapi.com/openapi.json` describes the
 *     `/v1/...` routes that take a `login_token` per request and are slated for deprecation;
 *     the V2 surface has no OpenAPI, only pages. This app targets V2 only.
 *  2. **V2 is action-based, not route-per-operation.** `POST /v2/{category}` with
 *     `{account_id, action, params}`; the verbs differ per action but the URL does not.
 *  3. **Docs and wire disagree on the enrichment route.** The overview says `POST /v2/mail`;
 *     that path is a 404. The live category is `POST /v2/enrich`, and it takes no `account_id`.
 *  4. **Errors are read from the body.** Failures carry `{success:false, error:{code}}` and a
 *     meaningful status, and a missing key is a 403 `INVALID_API_KEY`, not a 401.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import creditsGet from "./actions/credits-get.ts";
import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";
import logList from "./actions/log-list.ts";
import profileMe from "./actions/profile-me.ts";
import profileGet from "./actions/profile-get.ts";
import profileContactGet from "./actions/profile-contact-get.ts";
import profileVisit from "./actions/profile-visit.ts";
import peopleSearch from "./actions/people-search.ts";
import companyGet from "./actions/company-get.ts";
import companySearch from "./actions/company-search.ts";
import profileViewersList from "./actions/profile-viewers-list.ts";
import profilePostsList from "./actions/profile-posts-list.ts";
import profileReactionsList from "./actions/profile-reactions-list.ts";
import profileCommentsList from "./actions/profile-comments-list.ts";
import connectionInvite from "./actions/connection-invite.ts";
import invitationAccept from "./actions/invitation-accept.ts";
import invitationDecline from "./actions/invitation-decline.ts";
import invitationWithdraw from "./actions/invitation-withdraw.ts";
import invitationStatusGet from "./actions/invitation-status-get.ts";
import connectionList from "./actions/connection-list.ts";
import invitationList from "./actions/invitation-list.ts";
import invitationSentList from "./actions/invitation-sent-list.ts";
import networkRecommendationsList from "./actions/network-recommendations-list.ts";
import postCreate from "./actions/post-create.ts";
import postCreateCompany from "./actions/post-create-company.ts";
import postGet from "./actions/post-get.ts";
import postSearch from "./actions/post-search.ts";
import feedGet from "./actions/feed-get.ts";
import postReact from "./actions/post-react.ts";
import postComment from "./actions/post-comment.ts";
import commentReply from "./actions/comment-reply.ts";
import postRepost from "./actions/post-repost.ts";
import postCommentsList from "./actions/post-comments-list.ts";
import postReactionsList from "./actions/post-reactions-list.ts";
import messageSend from "./actions/message-send.ts";
import inboxList from "./actions/inbox-list.ts";
import conversationGet from "./actions/conversation-get.ts";
import jobList from "./actions/job-list.ts";
import jobCandidatesList from "./actions/job-candidates-list.ts";
import candidateCvGet from "./actions/candidate-cv-get.ts";
import jobCreate from "./actions/job-create.ts";
import jobPublish from "./actions/job-publish.ts";
import jobClose from "./actions/job-close.ts";
import emailFind from "./actions/email-find.ts";
import emailValidate from "./actions/email-validate.ts";
import emailReverse from "./actions/email-reverse.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookStart from "./actions/webhook-start.ts";
import webhookStop from "./actions/webhook-stop.ts";
import webhookEventsList from "./actions/webhook-events-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // account
    creditsGet,
    accountList,
    accountGet,
    logList,
    // profiles
    profileMe,
    profileGet,
    profileContactGet,
    profileVisit,
    peopleSearch,
    profileViewersList,
    profilePostsList,
    profileReactionsList,
    profileCommentsList,
    // companies
    companyGet,
    companySearch,
    // network
    connectionInvite,
    invitationAccept,
    invitationDecline,
    invitationWithdraw,
    invitationStatusGet,
    connectionList,
    invitationList,
    invitationSentList,
    networkRecommendationsList,
    // content
    postCreate,
    postCreateCompany,
    postGet,
    postSearch,
    feedGet,
    postReact,
    postComment,
    commentReply,
    postRepost,
    postCommentsList,
    postReactionsList,
    // messages
    messageSend,
    inboxList,
    conversationGet,
    // recruiter
    jobList,
    jobCandidatesList,
    candidateCvGet,
    jobCreate,
    jobPublish,
    jobClose,
    // enrich
    emailFind,
    emailValidate,
    emailReverse,
    // webhooks
    webhookList,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    webhookStart,
    webhookStop,
    webhookEventsList,
  ],
  // The API key only. LinkedIn / WhatsApp / email credentials are given to LinkupAPI in its own
  // dashboard (or its /v2/login), never to w6w: this app only ever holds the API key and the
  // account_id the vendor hands back.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
