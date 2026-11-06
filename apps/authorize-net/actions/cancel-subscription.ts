import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "cancel-subscription",
  "title": "Cancel Subscription",
  "description": "Cancel a recurring subscription; no further scheduled payments will be made.",
  "resource": "subscription",
  "type": "perform",
  "request": "ARBCancelSubscriptionRequest",
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
  ],
});
