import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import getAccount from "./actions/get-account.ts";

import listSubscribers from "./actions/list-subscribers.ts";
import getSubscriber from "./actions/get-subscriber.ts";
import createSubscriber from "./actions/create-subscriber.ts";
import updateSubscriber from "./actions/update-subscriber.ts";

import listTags from "./actions/list-tags.ts";
import createTag from "./actions/create-tag.ts";
import tagSubscriber from "./actions/tag-subscriber.ts";
import removeTagFromSubscriber from "./actions/remove-tag-from-subscriber.ts";

import listForms from "./actions/list-forms.ts";
import addSubscriberToForm from "./actions/add-subscriber-to-form.ts";

import listSequences from "./actions/list-sequences.ts";
import addSubscriberToSequence from "./actions/add-subscriber-to-sequence.ts";

import listBroadcasts from "./actions/list-broadcasts.ts";
import getBroadcast from "./actions/get-broadcast.ts";
import createBroadcast from "./actions/create-broadcast.ts";

import listCustomFields from "./actions/list-custom-fields.ts";
import createCustomField from "./actions/create-custom-field.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account
    getAccount,
    // Subscriber
    listSubscribers,
    getSubscriber,
    createSubscriber,
    updateSubscriber,
    // Tag
    listTags,
    createTag,
    tagSubscriber,
    removeTagFromSubscriber,
    // Form
    listForms,
    addSubscriberToForm,
    // Sequence
    listSequences,
    addSubscriberToSequence,
    // Broadcast
    listBroadcasts,
    getBroadcast,
    createBroadcast,
    // Custom field
    listCustomFields,
    createCustomField,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
