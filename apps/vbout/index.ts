/**
 * VBOUT — marketing automation: email contacts and lists, campaigns, tags, timelines, social
 * channels and goals over the VBOUT REST API (`api.vbout.com/1`).
 *
 * Every path, verb, parameter and enum here was verified on 2026-10-06 against VBOUT's OpenAPI
 * document (`developers.vbout.com/scripts/openapi.json`), its Quickstart and cURL samples, and live
 * probes of the host. See `lib/client.ts` for the wire conventions.
 *
 * Findings that shaped the design (details where they matter, and in the README):
 *
 *  1. **Auth is the `key` query parameter**, added by `sign` only (`auth/api-key.ts`).
 *  2. **Every answer is a `{response: {header: {status}, data}}` envelope**, and the verdict is
 *     `header.status`, not the HTTP status (`lib/client.ts`).
 *  3. **The OpenAPI document disagrees with the vendor's own samples** on delete verbs (DELETE vs
 *     POST) and on where write parameters go (query vs form body); the samples are followed.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import appGet from "./actions/app-get.ts";
import listList from "./actions/list-list.ts";
import listGet from "./actions/list-get.ts";
import listCreate from "./actions/list-create.ts";
import listUpdate from "./actions/list-update.ts";
import listDelete from "./actions/list-delete.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactGetByEmail from "./actions/contact-get-by-email.ts";
import contactTimelineGet from "./actions/contact-timeline-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactSync from "./actions/contact-sync.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactMove from "./actions/contact-move.ts";
import tagAdd from "./actions/tag-add.ts";
import tagRemove from "./actions/tag-remove.ts";
import activityAdd from "./actions/activity-add.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignStatsGet from "./actions/campaign-stats-get.ts";
import audienceList from "./actions/audience-list.ts";
import emailTemplateList from "./actions/email-template-list.ts";
import socialChannelList from "./actions/social-channel-list.ts";
import socialStatsList from "./actions/social-stats-list.ts";
import goalList from "./actions/goal-list.ts";

export default {
  actions: [
    appGet,
    listList,
    listGet,
    listCreate,
    listUpdate,
    listDelete,
    contactList,
    contactGet,
    contactGetByEmail,
    contactTimelineGet,
    contactCreate,
    contactUpdate,
    contactSync,
    contactDelete,
    contactMove,
    tagAdd,
    tagRemove,
    activityAdd,
    campaignList,
    campaignGet,
    campaignStatsGet,
    audienceList,
    emailTemplateList,
    socialChannelList,
    socialStatsList,
    goalList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
