import { logsAction } from "../lib/logs.ts";

export default logsAction({
  key: "whatsapp-logs",
  resource: "whatsapp",
  title: "WhatsApp Logs",
  description: "Message logs for WhatsApp traffic over a window of at most 3 days.",
  path: "/report/logs/wa",
  fieldsHint:
    "Comma-separated, no spaces: requestedAt, requestId, price, origin, failureReason, status, sentTime, deliveryTime, uuid, integratedNumber, customerNumber, messageType, direction, content, templateName, campaignName, …",
});
