import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import sendSms from "./actions/send-sms.ts";
import makeCall from "./actions/make-call.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import incomingMessage from "./triggers/incoming-message.ts";
import messageStatus from "./triggers/message-status.ts";

export default {
  actions: [sendSms, makeCall],
  auth: [apiKey],
  triggers: [incomingMessage, messageStatus],
  healthChecks: [service, quota],
} satisfies AppDefinition;
