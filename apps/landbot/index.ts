/**
 * Landbot — conversational chatbots over web chat, WhatsApp and Messenger. Channels, customers
 * (conversations), transcripts, outbound messages and WhatsApp templates, conversation
 * assignment, per-customer custom fields and channel message hooks, over the Landbot Platform
 * API (`api.landbot.io/v1`).
 *
 * Every path, verb, parameter and body here was verified on 2026-10-06 against Landbot's own
 * OpenAPI 3.1 document (`https://dev.landbot.io/api-reference/platform/openapi.json`) plus live
 * probes of the host. Details in the README; the ones that shaped the design:
 *
 *  1. **The `Token ` prefix is literal** and part of the header value (`auth/agent-token.ts`).
 *  2. **Every path ends in a slash**, and lists are `offset`/`limit` pages (`lib/client.ts`).
 *  3. **Channel and hook `token` fields are working secrets** and are redacted on the way out.
 *  4. The APIchat host (`chat.landbot.io`) is a different surface and is not built.
 */
import type { AppDefinition } from "@w6w/types";
import agentToken from "./auth/agent-token.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import channelList from "./actions/channel-list.ts";
import channelGet from "./actions/channel-get.ts";
import whatsappTemplateList from "./actions/whatsapp-template-list.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerMessagesList from "./actions/customer-messages-list.ts";
import customerArchive from "./actions/customer-archive.ts";
import customerUnarchive from "./actions/customer-unarchive.ts";
import customerBlock from "./actions/customer-block.ts";
import customerUnblock from "./actions/customer-unblock.ts";
import customerAssign from "./actions/customer-assign.ts";
import customerUnassign from "./actions/customer-unassign.ts";
import customerAssignAgent from "./actions/customer-assign-agent.ts";
import customerAssignBot from "./actions/customer-assign-bot.ts";
import customerOptOut from "./actions/customer-opt-out.ts";
import customerDelete from "./actions/customer-delete.ts";
import sendText from "./actions/send-text.ts";
import sendImage from "./actions/send-image.ts";
import sendLocation from "./actions/send-location.ts";
import sendTemplate from "./actions/send-template.ts";
import fieldGet from "./actions/field-get.ts";
import fieldCreate from "./actions/field-create.ts";
import fieldUpdate from "./actions/field-update.ts";
import fieldDelete from "./actions/field-delete.ts";
import messageHookList from "./actions/message-hook-list.ts";
import messageHookGet from "./actions/message-hook-get.ts";
import messageHookCreate from "./actions/message-hook-create.ts";
import messageHookDelete from "./actions/message-hook-delete.ts";

export default {
  actions: [
    channelList,
    channelGet,
    whatsappTemplateList,
    customerList,
    customerGet,
    customerMessagesList,
    customerArchive,
    customerUnarchive,
    customerBlock,
    customerUnblock,
    customerAssign,
    customerUnassign,
    customerAssignAgent,
    customerAssignBot,
    customerOptOut,
    customerDelete,
    sendText,
    sendImage,
    sendLocation,
    sendTemplate,
    fieldGet,
    fieldCreate,
    fieldUpdate,
    fieldDelete,
    messageHookList,
    messageHookGet,
    messageHookCreate,
    messageHookDelete,
  ],
  auth: [agentToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
