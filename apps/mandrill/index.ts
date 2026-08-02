import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import sendMessage from "./actions/send-message.ts";
import sendTemplateMessage from "./actions/send-template-message.ts";

import getUserInfo from "./actions/get-user-info.ts";
import listSenders from "./actions/list-senders.ts";

import listTags from "./actions/list-tags.ts";
import getTagInfo from "./actions/get-tag-info.ts";
import deleteTag from "./actions/delete-tag.ts";

import listRejects from "./actions/list-rejects.ts";
import addReject from "./actions/add-reject.ts";
import deleteReject from "./actions/delete-reject.ts";

import listWhitelist from "./actions/list-whitelist.ts";
import addWhitelist from "./actions/add-whitelist.ts";
import deleteWhitelist from "./actions/delete-whitelist.ts";

import listTemplates from "./actions/list-templates.ts";
import addTemplate from "./actions/add-template.ts";
import updateTemplate from "./actions/update-template.ts";
import deleteTemplate from "./actions/delete-template.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Message
    sendMessage,
    sendTemplateMessage,
    // Account
    getUserInfo,
    listSenders,
    // Tag
    listTags,
    getTagInfo,
    deleteTag,
    // Reject (denylist)
    listRejects,
    addReject,
    deleteReject,
    // Whitelist
    listWhitelist,
    addWhitelist,
    deleteWhitelist,
    // Template
    listTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
