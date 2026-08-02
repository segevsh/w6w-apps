import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import sendEmail from "./actions/send-email.ts";
import sendEmailBatch from "./actions/send-email-batch.ts";
import sendEmailWithTemplate from "./actions/send-email-with-template.ts";

import listOutboundMessages from "./actions/list-outbound-messages.ts";
import getOutboundMessage from "./actions/get-outbound-message.ts";
import listMessageOpens from "./actions/list-message-opens.ts";

import listBounces from "./actions/list-bounces.ts";
import getBounce from "./actions/get-bounce.ts";
import activateBounce from "./actions/activate-bounce.ts";

import getServerInfo from "./actions/get-server-info.ts";
import getOutboundStats from "./actions/get-outbound-stats.ts";

import listTemplates from "./actions/list-templates.ts";
import createTemplate from "./actions/create-template.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Send
    sendEmail,
    sendEmailBatch,
    sendEmailWithTemplate,
    // Messages
    listOutboundMessages,
    getOutboundMessage,
    listMessageOpens,
    // Bounces
    listBounces,
    getBounce,
    activateBounce,
    // Server & stats
    getServerInfo,
    getOutboundStats,
    // Templates
    listTemplates,
    createTemplate,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
