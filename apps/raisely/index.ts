/**
 * Raisely — the fundraising platform: campaigns, fundraiser profiles, donations, users
 * (supporters and donors), recurring subscriptions and tags, over the Raisely API v3
 * (`api.raisely.com/v3`).
 *
 * Every path, verb, request/response field and enum in this app was verified on 2026-10-06
 * against Raisely's own OpenAPI 3.0.0 document ("Raisely API", the ReadMe registry document
 * behind developers.raisely.com/reference) plus live probes against `api.raisely.com`.
 *
 * The findings that shaped this app:
 *
 *  1. **Anonymous reads are allowed by the spec** (`lib/client.ts`, `auth/api-key.ts`). The
 *     global security is `[{}, {BearerAuth}]`, so a bare list proves nothing about the key;
 *     reads send `private=true`, and the auth probe classifies Raisely's own `code`
 *     (`unauthorized` / `forbidden`) rather than the status.
 *  2. **User records carry a login `accessToken`** (`lib/client.ts`). It is stripped from every
 *     response.
 *  3. **Request bodies are wrapped** in `{"data": ...}` with `overwriteCustomFields` / `merge`
 *     as top-level siblings.
 *  4. **The status page moved** (`health/service.ts`): `status.raisely.com` redirects to
 *     `www.raiselystatus.com`, and that final host is the one declared.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignUpdate from "./actions/campaign-update.ts";
import profileList from "./actions/profile-list.ts";
import profileGet from "./actions/profile-get.ts";
import profileUpdate from "./actions/profile-update.ts";
import donationList from "./actions/donation-list.ts";
import donationGet from "./actions/donation-get.ts";
import donationCreate from "./actions/donation-create.ts";
import donationUpdate from "./actions/donation-update.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionUpdate from "./actions/subscription-update.ts";
import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import tagRecordList from "./actions/tag-record-list.ts";
import tagRecordAdd from "./actions/tag-record-add.ts";
import tagRecordRemove from "./actions/tag-record-remove.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Campaigns
    campaignList,
    campaignGet,
    campaignUpdate,
    // Profiles
    profileList,
    profileGet,
    profileUpdate,
    // Donations
    donationList,
    donationGet,
    donationCreate,
    donationUpdate,
    // Users
    userList,
    userGet,
    userCreate,
    userUpdate,
    // Subscriptions
    subscriptionList,
    subscriptionGet,
    subscriptionUpdate,
    // Tags
    tagList,
    tagGet,
    tagRecordList,
    tagRecordAdd,
    tagRecordRemove,
  ],
  // API key only: the spec's other scheme (`QueryToken`, a user access token in the URL) is not
  // offered, because a credential in a query string is logged everywhere.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
