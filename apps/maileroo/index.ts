import type { AppDefinition } from "@w6w/types";
import cancelVerification from "./actions/cancel-verification.ts";
import checkVerification from "./actions/check-verification.ts";
import createSuppression from "./actions/create-suppression.ts";
import deleteScheduledEmail from "./actions/delete-scheduled-email.ts";
import deleteSuppression from "./actions/delete-suppression.ts";
import getAccount from "./actions/get-account.ts";
import getApplication from "./actions/get-application.ts";
import getDomain from "./actions/get-domain.ts";
import getDomainAnalytics from "./actions/get-domain-analytics.ts";
import getEmailLog from "./actions/get-email-log.ts";
import getSenderProfile from "./actions/get-sender-profile.ts";
import getStatisticsSummary from "./actions/get-statistics-summary.ts";
import getStatisticsTimeline from "./actions/get-statistics-timeline.ts";
import getTemplate from "./actions/get-template.ts";
import getVerification from "./actions/get-verification.ts";
import listApplications from "./actions/list-applications.ts";
import listDomains from "./actions/list-domains.ts";
import listScheduledEmails from "./actions/list-scheduled-emails.ts";
import listSenderProfiles from "./actions/list-sender-profiles.ts";
import listSuppressions from "./actions/list-suppressions.ts";
import listTemplates from "./actions/list-templates.ts";
import listVerifications from "./actions/list-verifications.ts";
import resendEmail from "./actions/resend-email.ts";
import searchEmailLogs from "./actions/search-email-logs.ts";
import sendBulkEmails from "./actions/send-bulk-emails.ts";
import sendEmail from "./actions/send-email.ts";
import sendTemplatedEmail from "./actions/send-templated-email.ts";
import sendVerification from "./actions/send-verification.ts";
import apiKeys from "./auth/api-keys.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Maileroo: transactional email sending, delivery logs and account management, plus OTP
 * Verification. Findings that shaped this app (2026-10-06):
 *
 * - Two API hosts and two credentials: a Sending Key for `smtp.maileroo.com` (Email API) and a
 *   scoped Account API Key for `api.maileroo.com` (Account API + OTP Verification). One
 *   connection holds both; `sign` picks by host.
 * - The two hosts use different envelopes and error shapes (`{success,message,data}` vs
 *   `{data}` / `{error:{message}}`); the client reads both.
 * - "Verification" here is OTP delivery (SMS, voice, WhatsApp, Telegram, email) and code
 *   checking, not address validation. A wrong code is a 200 with `status: "incorrect"`.
 */
const app: AppDefinition = {
  actions: [
    cancelVerification,
    checkVerification,
    createSuppression,
    deleteScheduledEmail,
    deleteSuppression,
    getAccount,
    getApplication,
    getDomain,
    getDomainAnalytics,
    getEmailLog,
    getSenderProfile,
    getStatisticsSummary,
    getStatisticsTimeline,
    getTemplate,
    getVerification,
    listApplications,
    listDomains,
    listScheduledEmails,
    listSenderProfiles,
    listSuppressions,
    listTemplates,
    listVerifications,
    resendEmail,
    searchEmailLogs,
    sendBulkEmails,
    sendEmail,
    sendTemplatedEmail,
    sendVerification,
  ],
  auth: [apiKeys],
  healthChecks: [service, api, quota],
};

export default app;
