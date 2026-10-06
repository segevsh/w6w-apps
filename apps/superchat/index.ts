import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import meGet from "./actions/me-get.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import inboxList from "./actions/inbox-list.ts";
import inboxGet from "./actions/inbox-get.ts";
import channelList from "./actions/channel-list.ts";
import channelGet from "./actions/channel-get.ts";
import labelList from "./actions/label-list.ts";
import labelGet from "./actions/label-get.ts";
import contactListsList from "./actions/contact-lists-list.ts";
import contactListsGet from "./actions/contact-lists-get.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactSearch from "./actions/contact-search.ts";
import contactConversationsList from "./actions/contact-conversations-list.ts";
import contactContactListsList from "./actions/contact-contact-lists-list.ts";
import contactAddToList from "./actions/contact-add-to-list.ts";
import contactRemoveFromList from "./actions/contact-remove-from-list.ts";
import conversationList from "./actions/conversation-list.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationUpdate from "./actions/conversation-update.ts";
import conversationDelete from "./actions/conversation-delete.ts";
import conversationMessagesList from "./actions/conversation-messages-list.ts";
import conversationExportCreate from "./actions/conversation-export-create.ts";
import conversationExportGet from "./actions/conversation-export-get.ts";
import noteList from "./actions/note-list.ts";
import noteCreate from "./actions/note-create.ts";
import noteUpdate from "./actions/note-update.ts";
import noteDelete from "./actions/note-delete.ts";
import messageSend from "./actions/message-send.ts";
import messageGet from "./actions/message-get.ts";
import messageAnalyticsGet from "./actions/message-analytics-get.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateDelete from "./actions/template-delete.ts";
import templateAnalyticsGet from "./actions/template-analytics-get.ts";
import templateFolderList from "./actions/template-folder-list.ts";
import templateFolderCreate from "./actions/template-folder-create.ts";
import templateFolderDelete from "./actions/template-folder-delete.ts";
import customAttributeList from "./actions/custom-attribute-list.ts";
import customAttributeCreate from "./actions/custom-attribute-create.ts";
import customAttributeDelete from "./actions/custom-attribute-delete.ts";
import fileList from "./actions/file-list.ts";
import fileGet from "./actions/file-get.ts";
import fileDelete from "./actions/file-delete.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    meGet,
    userList,
    userGet,
    inboxList,
    inboxGet,
    channelList,
    channelGet,
    labelList,
    labelGet,
    contactListsList,
    contactListsGet,
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactSearch,
    contactConversationsList,
    contactContactListsList,
    contactAddToList,
    contactRemoveFromList,
    conversationList,
    conversationGet,
    conversationUpdate,
    conversationDelete,
    conversationMessagesList,
    conversationExportCreate,
    conversationExportGet,
    noteList,
    noteCreate,
    noteUpdate,
    noteDelete,
    messageSend,
    messageGet,
    messageAnalyticsGet,
    templateList,
    templateGet,
    templateDelete,
    templateAnalyticsGet,
    templateFolderList,
    templateFolderCreate,
    templateFolderDelete,
    customAttributeList,
    customAttributeCreate,
    customAttributeDelete,
    fileList,
    fileGet,
    fileDelete,
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
