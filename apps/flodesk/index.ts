import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

import listSubscribers from "./actions/list-subscribers.ts";
import getSubscriber from "./actions/get-subscriber.ts";
import createOrUpdateSubscriber from "./actions/create-or-update-subscriber.ts";
import batchCreateOrUpdateSubscribers from "./actions/batch-create-or-update-subscribers.ts";
import addSubscriberToSegments from "./actions/add-subscriber-to-segments.ts";
import removeSubscriberFromSegments from "./actions/remove-subscriber-from-segments.ts";
import unsubscribeSubscriber from "./actions/unsubscribe-subscriber.ts";

import listSegments from "./actions/list-segments.ts";
import getSegment from "./actions/get-segment.ts";
import createSegment from "./actions/create-segment.ts";
import listSegmentColors from "./actions/list-segment-colors.ts";

import listWorkflows from "./actions/list-workflows.ts";
import addSubscriberToWorkflow from "./actions/add-subscriber-to-workflow.ts";
import removeSubscriberFromWorkflow from "./actions/remove-subscriber-from-workflow.ts";

import listCustomFields from "./actions/list-custom-fields.ts";
import listAllCustomFields from "./actions/list-all-custom-fields.ts";
import createCustomField from "./actions/create-custom-field.ts";

import listWebhooks from "./actions/list-webhooks.ts";
import getWebhook from "./actions/get-webhook.ts";
import createWebhook from "./actions/create-webhook.ts";
import updateWebhook from "./actions/update-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

/**
 * Flodesk — one Action per documented endpoint, and no more.
 *
 * Flodesk's published REST surface is exactly 22 operations across five
 * resources. All 22 are here. See README.md for the full accounting, including
 * the three `campaign` operations that exist in the vendor's OpenAPI document
 * but are excluded from its published documentation and are therefore
 * deliberately NOT implemented.
 */
export default {
  actions: [
    // Subscriber (7)
    listSubscribers,
    getSubscriber,
    createOrUpdateSubscriber,
    batchCreateOrUpdateSubscribers,
    addSubscriberToSegments,
    removeSubscriberFromSegments,
    unsubscribeSubscriber,
    // Segment (4)
    listSegments,
    getSegment,
    createSegment,
    listSegmentColors,
    // Workflow (3)
    listWorkflows,
    addSubscriberToWorkflow,
    removeSubscriberFromWorkflow,
    // Custom field (3)
    listCustomFields,
    listAllCustomFields,
    createCustomField,
    // Webhook (5)
    listWebhooks,
    getWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
  ],
  auth: [apiKey, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
