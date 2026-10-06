/**
 * SavvyCal — scheduling links. Manage links, book and cancel events, read
 * availability, and register webhooks over the SavvyCal Meetings API
 * (`api.savvycal.com/v1`).
 *
 * Built against the machine-readable OpenAPI behind developers.savvycal.com
 * (checked 2026-10-06); no deprecation or sunset notice appears anywhere in it.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import eventCreate from "./actions/event-create.ts";
import eventCancel from "./actions/event-cancel.ts";
import linkList from "./actions/link-list.ts";
import linkGet from "./actions/link-get.ts";
import linkCreate from "./actions/link-create.ts";
import linkUpdate from "./actions/link-update.ts";
import linkDelete from "./actions/link-delete.ts";
import linkDuplicate from "./actions/link-duplicate.ts";
import linkToggle from "./actions/link-toggle.ts";
import linkSlotsGet from "./actions/link-slots-get.ts";
import userGet from "./actions/user-get.ts";
import timeZoneList from "./actions/time-zone-list.ts";
import timeZoneGet from "./actions/time-zone-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import workflowList from "./actions/workflow-list.ts";
import workflowRulesList from "./actions/workflow-rules-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    eventList,
    eventGet,
    eventCreate,
    eventCancel,
    linkList,
    linkGet,
    linkCreate,
    linkUpdate,
    linkDelete,
    linkDuplicate,
    linkToggle,
    linkSlotsGet,
    userGet,
    timeZoneList,
    timeZoneGet,
    webhookList,
    webhookGet,
    webhookCreate,
    webhookDelete,
    workflowList,
    workflowRulesList,
  ],
  auth: [personalAccessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
