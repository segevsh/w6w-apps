import type { AppDefinition } from "@w6w/types";
import emailLogs from "./actions/email-logs.ts";
import emailSend from "./actions/email-send.ts";
import emailTemplatesList from "./actions/email-templates-list.ts";
import emailValidate from "./actions/email-validate.ts";
import otpLogs from "./actions/otp-logs.ts";
import otpResend from "./actions/otp-resend.ts";
import otpSend from "./actions/otp-send.ts";
import otpVerify from "./actions/otp-verify.ts";
import smsAnalytics from "./actions/sms-analytics.ts";
import smsSend from "./actions/sms-send.ts";
import whatsappBalanceGet from "./actions/whatsapp-balance-get.ts";
import whatsappLogs from "./actions/whatsapp-logs.ts";
import whatsappMessageSend from "./actions/whatsapp-message-send.ts";
import whatsappNumbersList from "./actions/whatsapp-numbers-list.ts";
import whatsappTemplateSend from "./actions/whatsapp-template-send.ts";
import whatsappTemplatesList from "./actions/whatsapp-templates-list.ts";
import authkey from "./auth/authkey.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * MSG91 — SMS (DLT template flows), OTP (send / verify / resend), email, WhatsApp and delivery
 * reports over the v5 API (`https://control.msg91.com/api/v5`, `authkey` header). Every path,
 * verb, parameter and body field was read off docs.msg91.com (one reference page per endpoint)
 * and cross-checked with unsigned live probes on 2026-10-06. See README.md for what is
 * deliberately not covered.
 */
export default {
  actions: [
    smsSend,
    smsAnalytics,
    otpSend,
    otpVerify,
    otpResend,
    otpLogs,
    emailSend,
    emailValidate,
    emailTemplatesList,
    emailLogs,
    whatsappTemplateSend,
    whatsappMessageSend,
    whatsappNumbersList,
    whatsappTemplatesList,
    whatsappBalanceGet,
    whatsappLogs,
  ],
  auth: [authkey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
