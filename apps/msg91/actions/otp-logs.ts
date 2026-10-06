import { logsAction } from "../lib/logs.ts";

export default logsAction({
  key: "otp-logs",
  resource: "otp",
  title: "OTP Logs",
  description: "Delivery logs for OTP messages over a window of at most 3 days.",
  path: "/report/logs/p/otp",
  fieldsHint:
    "Comma-separated, no spaces: requestDate, status, deliveryDate, deliveryTime, telNum, requestId, senderId, failureReason, statusCode, credit, templateID, …",
});
