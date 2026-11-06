import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-subscription-status",
  "title": "Get Subscription Status",
  "description": "Retrieve the status of a recurring subscription.",
  "resource": "subscription",
  "type": "read",
  "request": "ARBGetSubscriptionStatusRequest",
  "params": [
    {
      "key": "subscriptionId",
      "label": "Subscription id",
      "type": "string",
      "required": true,
    },
  ],
  "output": [
    {
      "key": "refId",
      "type": "string",
      "label": "Reference ID",
    },
    {
      "key": "messages",
      "type": "object",
      "label": "Messages",
    },
    {
      "key": "sessionToken",
      "type": "string",
      "label": "Session token",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Status",
    },
  ],
});
