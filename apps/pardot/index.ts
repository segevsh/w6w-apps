/**
 * Pardot (Salesforce Account Engagement) — w6w app, built against API **v5** only.
 *
 * What shapes the code:
 *
 *   - **Two headers on every call**: `Authorization: Bearer <token>` and
 *     `Pardot-Business-Unit-Id: 0Uv…`. Both are stamped by `sign`, the only code that
 *     holds the credential, so no action mentions either.
 *   - **Two hosts**: `pi.pardot.com` (production) and `pi.demo.pardot.com` (developer
 *     orgs and sandboxes). The host is a connect-time choice, recorded on the
 *     connection's `display` by `afterConnect`; the wrong one answers like a bad
 *     business unit id.
 *   - **`fields` is mandatory** on every v5 read and query, so each action carries a
 *     sensible default list and lets the caller widen it (dot notation for relations).
 *   - **Pagination is `nextPageToken`**, and a follow-up call may carry nothing but the
 *     token and `fields` (`lib/query.ts` enforces that).
 *
 * Deliberately absent: see the README's "Not yet covered" list.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";
import oauth2Sandbox from "./auth/oauth2-sandbox.ts";

import prospectList from "./actions/prospect-list.ts";
import prospectGet from "./actions/prospect-get.ts";
import prospectCreate from "./actions/prospect-create.ts";
import prospectUpdate from "./actions/prospect-update.ts";
import prospectUpsert from "./actions/prospect-upsert.ts";
import prospectDelete from "./actions/prospect-delete.ts";
import prospectAddTag from "./actions/prospect-add-tag.ts";
import prospectRemoveTag from "./actions/prospect-remove-tag.ts";
import prospectAccountList from "./actions/prospect-account-list.ts";
import listList from "./actions/list-list.ts";
import listGet from "./actions/list-get.ts";
import listCreate from "./actions/list-create.ts";
import listMembershipList from "./actions/list-membership-list.ts";
import listMembershipCreate from "./actions/list-membership-create.ts";
import listMembershipDelete from "./actions/list-membership-delete.ts";
import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import campaignList from "./actions/campaign-list.ts";
import customFieldList from "./actions/custom-field-list.ts";
import formList from "./actions/form-list.ts";
import formHandlerList from "./actions/form-handler-list.ts";
import landingPageList from "./actions/landing-page-list.ts";
import emailList from "./actions/email-list.ts";
import visitorList from "./actions/visitor-list.ts";
import visitorActivityList from "./actions/visitor-activity-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // prospects
    prospectList,
    prospectGet,
    prospectCreate,
    prospectUpdate,
    prospectUpsert,
    prospectDelete,
    prospectAddTag,
    prospectRemoveTag,
    prospectAccountList,
    // lists
    listList,
    listGet,
    listCreate,
    listMembershipList,
    listMembershipCreate,
    listMembershipDelete,
    // tags
    tagList,
    tagCreate,
    // marketing assets
    campaignList,
    customFieldList,
    formList,
    formHandlerList,
    landingPageList,
    emailList,
    // tracking
    visitorList,
    visitorActivityList,
  ],
  auth: [oauth2, oauth2Sandbox, accessToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
