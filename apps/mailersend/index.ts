/**
 * MailerSend — transactional email: send, bulk send, templates, domains, sender identities,
 * suppressions, activity and analytics, webhooks — over the MailerSend API v1
 * (`api.mailersend.com/v1`). See README.md for what was verified and what is not covered.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import addSuppressions from "./actions/add-suppressions.ts";
import createDomain from "./actions/create-domain.ts";
import createSenderIdentity from "./actions/create-sender-identity.ts";
import createTemplate from "./actions/create-template.ts";
import createWebhook from "./actions/create-webhook.ts";
import deleteDomain from "./actions/delete-domain.ts";
import deleteRecipient from "./actions/delete-recipient.ts";
import deleteScheduledMessage from "./actions/delete-scheduled-message.ts";
import deleteSenderIdentity from "./actions/delete-sender-identity.ts";
import deleteSuppressions from "./actions/delete-suppressions.ts";
import deleteTemplate from "./actions/delete-template.ts";
import deleteWebhook from "./actions/delete-webhook.ts";
import getActivity from "./actions/get-activity.ts";
import getAnalyticsByDate from "./actions/get-analytics-by-date.ts";
import getBulkEmailStatus from "./actions/get-bulk-email-status.ts";
import getDomain from "./actions/get-domain.ts";
import getDomainDnsRecords from "./actions/get-domain-dns-records.ts";
import getEmail from "./actions/get-email.ts";
import getMessage from "./actions/get-message.ts";
import getOpensAnalytics from "./actions/get-opens-analytics.ts";
import getRecipient from "./actions/get-recipient.ts";
import getScheduledMessage from "./actions/get-scheduled-message.ts";
import getSenderIdentity from "./actions/get-sender-identity.ts";
import getTemplate from "./actions/get-template.ts";
import getWebhook from "./actions/get-webhook.ts";
import listActivities from "./actions/list-activities.ts";
import listDomains from "./actions/list-domains.ts";
import listEmails from "./actions/list-emails.ts";
import listMessages from "./actions/list-messages.ts";
import listRecipients from "./actions/list-recipients.ts";
import listScheduledMessages from "./actions/list-scheduled-messages.ts";
import listSenderIdentities from "./actions/list-sender-identities.ts";
import listSuppressions from "./actions/list-suppressions.ts";
import listTemplates from "./actions/list-templates.ts";
import listWebhooks from "./actions/list-webhooks.ts";
import resendSenderIdentityVerification from "./actions/resend-sender-identity-verification.ts";
import sendBulkEmail from "./actions/send-bulk-email.ts";
import sendEmail from "./actions/send-email.ts";
import updateDomainSettings from "./actions/update-domain-settings.ts";
import updateSenderIdentity from "./actions/update-sender-identity.ts";
import updateTemplate from "./actions/update-template.ts";
import updateWebhook from "./actions/update-webhook.ts";
import verifyDomain from "./actions/verify-domain.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Sending
    sendEmail,
    sendBulkEmail,
    getBulkEmailStatus,
    // Delivery records
    listEmails,
    getEmail,
    listActivities,
    getActivity,
    listMessages,
    getMessage,
    listScheduledMessages,
    getScheduledMessage,
    deleteScheduledMessage,
    // Templates
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    // Domains
    listDomains,
    getDomain,
    createDomain,
    updateDomainSettings,
    getDomainDnsRecords,
    verifyDomain,
    deleteDomain,
    // Sender identities
    listSenderIdentities,
    getSenderIdentity,
    createSenderIdentity,
    updateSenderIdentity,
    resendSenderIdentityVerification,
    deleteSenderIdentity,
    // Recipients and suppressions
    listRecipients,
    getRecipient,
    deleteRecipient,
    listSuppressions,
    addSuppressions,
    deleteSuppressions,
    // Analytics
    getAnalyticsByDate,
    getOpensAnalytics,
    // Webhooks
    listWebhooks,
    getWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
  ],
  // API token only: MailerSend publishes no OAuth surface for third-party apps.
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
