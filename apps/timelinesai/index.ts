import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import workspaceGet from "./actions/workspace-get.ts";
import whatsappAccountsList from "./actions/whatsapp-accounts-list.ts";
import teammatesList from "./actions/teammates-list.ts";
import chatsList from "./actions/chats-list.ts";
import chatGet from "./actions/chat-get.ts";
import chatUpdate from "./actions/chat-update.ts";
import messagesList from "./actions/messages-list.ts";
import messageGet from "./actions/message-get.ts";
import messageStatusHistory from "./actions/message-status-history.ts";
import messageSendToChat from "./actions/message-send-to-chat.ts";
import messageSendToPhone from "./actions/message-send-to-phone.ts";
import messageSendToJid from "./actions/message-send-to-jid.ts";
import noteAdd from "./actions/note-add.ts";
import labelsList from "./actions/labels-list.ts";
import labelsAdd from "./actions/labels-add.ts";
import labelsReplace from "./actions/labels-replace.ts";
import filesList from "./actions/files-list.ts";
import fileUploadUrl from "./actions/file-upload-url.ts";
import fileGet from "./actions/file-get.ts";
import fileDelete from "./actions/file-delete.ts";
import webhooksList from "./actions/webhooks-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import reactionsGet from "./actions/reactions-get.ts";
import reactionUpdate from "./actions/reaction-update.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    workspaceGet,
    whatsappAccountsList,
    teammatesList,
    chatsList,
    chatGet,
    chatUpdate,
    messagesList,
    messageGet,
    messageStatusHistory,
    messageSendToChat,
    messageSendToPhone,
    messageSendToJid,
    noteAdd,
    labelsList,
    labelsAdd,
    labelsReplace,
    filesList,
    fileUploadUrl,
    fileGet,
    fileDelete,
    webhooksList,
    webhookCreate,
    webhookGet,
    webhookUpdate,
    webhookDelete,
    reactionsGet,
    reactionUpdate,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
