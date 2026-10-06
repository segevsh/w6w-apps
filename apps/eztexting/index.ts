import type { AppDefinition } from "@w6w/types";
import contactBatchUpsert from "./actions/contact-batch-upsert.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpsert from "./actions/contact-upsert.ts";
import conversationList from "./actions/conversation-list.ts";
import conversationMessageList from "./actions/conversation-message-list.ts";
import creditBalanceGet from "./actions/credit-balance-get.ts";
import groupAddContacts from "./actions/group-add-contacts.ts";
import groupCreate from "./actions/group-create.ts";
import groupDelete from "./actions/group-delete.ts";
import groupGet from "./actions/group-get.ts";
import groupList from "./actions/group-list.ts";
import groupRemoveContacts from "./actions/group-remove-contacts.ts";
import groupUpdate from "./actions/group-update.ts";
import keywordCheck from "./actions/keyword-check.ts";
import keywordGet from "./actions/keyword-get.ts";
import keywordList from "./actions/keyword-list.ts";
import mediaCreate from "./actions/media-create.ts";
import mediaDelete from "./actions/media-delete.ts";
import mediaGet from "./actions/media-get.ts";
import mediaList from "./actions/media-list.ts";
import messageDelete from "./actions/message-delete.ts";
import messageDetailsGet from "./actions/message-details-get.ts";
import messageList from "./actions/message-list.ts";
import messageReportGet from "./actions/message-report-get.ts";
import messageSend from "./actions/message-send.ts";
import outboundBlock from "./actions/outbound-block.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookList from "./actions/webhook-list.ts";
import basic from "./auth/basic.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * EZ Texting — SMS/MMS messaging, contacts, groups, media, keywords, inbox and webhooks over the
 * EZ Texting API v1 (`https://a.eztexting.com/v1`, HTTP Basic). Every path, verb, parameter and
 * body field was read off the OpenAPI document embedded in the vendor's developer portal
 * (`developers.eztexting.com/reference/*`) and cross-checked against its guides and live probes
 * on 2026-10-06. See README.md for what is deliberately not covered.
 */
export default {
  actions: [
    messageSend,
    messageList,
    messageDelete,
    messageDetailsGet,
    messageReportGet,
    outboundBlock,
    contactList,
    contactGet,
    contactUpsert,
    contactBatchUpsert,
    contactDelete,
    groupList,
    groupGet,
    groupCreate,
    groupUpdate,
    groupDelete,
    groupAddContacts,
    groupRemoveContacts,
    mediaList,
    mediaCreate,
    mediaGet,
    mediaDelete,
    keywordList,
    keywordGet,
    keywordCheck,
    conversationList,
    conversationMessageList,
    creditBalanceGet,
    webhookList,
    webhookCreate,
    webhookDelete,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
