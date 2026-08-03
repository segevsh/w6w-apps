import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listSubscribers from "./actions/list-subscribers.ts";
import getSubscriber from "./actions/get-subscriber.ts";
import upsertSubscriber from "./actions/upsert-subscriber.ts";
import updateSubscriber from "./actions/update-subscriber.ts";
import deleteSubscriber from "./actions/delete-subscriber.ts";

import listGroups from "./actions/list-groups.ts";
import createGroup from "./actions/create-group.ts";
import listGroupSubscribers from "./actions/list-group-subscribers.ts";
import assignSubscriberToGroup from "./actions/assign-subscriber-to-group.ts";
import unassignSubscriberFromGroup from "./actions/unassign-subscriber-from-group.ts";

import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";
import createCampaign from "./actions/create-campaign.ts";
import scheduleCampaign from "./actions/schedule-campaign.ts";

import listFields from "./actions/list-fields.ts";
import listSegments from "./actions/list-segments.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Subscriber
    listSubscribers,
    getSubscriber,
    upsertSubscriber,
    updateSubscriber,
    deleteSubscriber,
    // Group
    listGroups,
    createGroup,
    listGroupSubscribers,
    assignSubscriberToGroup,
    unassignSubscriberFromGroup,
    // Campaign
    listCampaigns,
    getCampaign,
    createCampaign,
    scheduleCampaign,
    // Lookups
    listFields,
    listSegments,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
