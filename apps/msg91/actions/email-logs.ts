import { logsAction } from "../lib/logs.ts";

export default logsAction({
  key: "email-logs",
  resource: "email",
  title: "Email Logs",
  description: "Delivery logs for emails sent through MSG91 over a window of at most 3 days.",
  path: "/report/logs/mail",
  fieldsHint:
    "Comma-separated, no spaces: createdAt, domain, statusUpdatedAt, recipientEmail, requestId, senderEmail, failureReason, status, description, campaignName, mailType, subject.",
});
