import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-subscription",
  "title": "Get Subscription",
  "description": "Retrieve a subscription, optionally including its transactions.",
  "resource": "subscription",
  "type": "read",
  "request": "ARBGetSubscriptionRequest",
  "params": [
    {
      "key": "subscriptionId",
      "label": "Subscription id",
      "type": "string",
      "required": true,
    },
    {
      "key": "includeTransactions",
      "label": "Include transactions",
      "type": "boolean",
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
      "key": "subscription",
      "type": "object",
      "label": "Subscription",
    },
  ],
});
