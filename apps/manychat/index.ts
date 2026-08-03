import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

// Page
import getPageInfo from "./actions/get-page-info.ts";
import listTags from "./actions/list-tags.ts";
import createTag from "./actions/create-tag.ts";
import deleteTag from "./actions/delete-tag.ts";
import listCustomFields from "./actions/list-custom-fields.ts";
import createCustomField from "./actions/create-custom-field.ts";
import listFlows from "./actions/list-flows.ts";
import listGrowthTools from "./actions/list-growth-tools.ts";
import listOtnTopics from "./actions/list-otn-topics.ts";

// Bot fields (Page-global key/value)
import listBotFields from "./actions/list-bot-fields.ts";
import createBotField from "./actions/create-bot-field.ts";
import setBotField from "./actions/set-bot-field.ts";
import setBotFields from "./actions/set-bot-fields.ts";

// Sending
import sendFlow from "./actions/send-flow.ts";
import sendContent from "./actions/send-content.ts";

// Subscriber — reads
import getSubscriber from "./actions/get-subscriber.ts";
import findSubscribersByName from "./actions/find-subscribers-by-name.ts";
import findSubscriberBySystemField from "./actions/find-subscriber-by-system-field.ts";
import findSubscribersByCustomField from "./actions/find-subscribers-by-custom-field.ts";

// Subscriber — writes
import createSubscriber from "./actions/create-subscriber.ts";
import updateSubscriber from "./actions/update-subscriber.ts";
import addSubscriberTag from "./actions/add-subscriber-tag.ts";
import removeSubscriberTag from "./actions/remove-subscriber-tag.ts";
import setSubscriberField from "./actions/set-subscriber-field.ts";
import setSubscriberFields from "./actions/set-subscriber-fields.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Page
    getPageInfo,
    listTags,
    createTag,
    deleteTag,
    listCustomFields,
    createCustomField,
    listFlows,
    listGrowthTools,
    listOtnTopics,
    // Bot fields
    listBotFields,
    createBotField,
    setBotField,
    setBotFields,
    // Sending
    sendFlow,
    sendContent,
    // Subscriber reads
    getSubscriber,
    findSubscribersByName,
    findSubscriberBySystemField,
    findSubscribersByCustomField,
    // Subscriber writes
    createSubscriber,
    updateSubscriber,
    addSubscriberTag,
    removeSubscriberTag,
    setSubscriberField,
    setSubscriberFields,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
