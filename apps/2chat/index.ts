import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import usersList from "./actions/users-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactsList from "./actions/contacts-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactsSearch from "./actions/contacts-search.ts";
import webhookSubscribe from "./actions/webhook-subscribe.ts";
import webhooksList from "./actions/webhooks-list.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import numbersList from "./actions/numbers-list.ts";
import channelStatusGet from "./actions/channel-status-get.ts";
import channelCommand from "./actions/channel-command.ts";
import messageSend from "./actions/message-send.ts";
import messagesList from "./actions/messages-list.ts";
import conversationsList from "./actions/conversations-list.ts";
import messageGet from "./actions/message-get.ts";
import messageDelete from "./actions/message-delete.ts";
import groupMessagesList from "./actions/group-messages-list.ts";
import numberCheck from "./actions/number-check.ts";
import statusPost from "./actions/status-post.ts";
import groupsList from "./actions/groups-list.ts";
import groupGet from "./actions/group-get.ts";
import groupCreate from "./actions/group-create.ts";
import groupParticipantsUpdate from "./actions/group-participants-update.ts";
import wabaMessageSend from "./actions/waba-message-send.ts";
import wabaTemplatesList from "./actions/waba-templates-list.ts";
import wabaConversationWindowGet from "./actions/waba-conversation-window-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    usersList,
    contactCreate,
    contactsList,
    contactGet,
    contactUpdate,
    contactDelete,
    contactsSearch,
    webhookSubscribe,
    webhooksList,
    webhookDelete,
    numbersList,
    channelStatusGet,
    channelCommand,
    messageSend,
    messagesList,
    conversationsList,
    messageGet,
    messageDelete,
    groupMessagesList,
    numberCheck,
    statusPost,
    groupsList,
    groupGet,
    groupCreate,
    groupParticipantsUpdate,
    wabaMessageSend,
    wabaTemplatesList,
    wabaConversationWindowGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
