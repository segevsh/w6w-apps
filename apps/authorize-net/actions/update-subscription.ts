import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "update-subscription",
  "title": "Update Subscription",
  "description": "Update a recurring subscription. Supply only the subscription fields to change.",
  "resource": "subscription",
  "type": "perform",
  "request": "ARBUpdateSubscriptionRequest",
  "params": [
    {
      "key": "subscriptionId",
      "label": "Subscription id",
      "type": "string",
      "required": true,
    },
    {
      "key": "subscription",
      "label": "Subscription",
      "type": "json",
      "required": true,
      "secret": true,
      "hint":
        "JSON object. Supported fields: name, paymentSchedule, amount, trialAmount, payment, order, customer, billTo, shipTo, profile. Nested fields are ordered automatically.",
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
      "key": "profile",
      "type": "object",
      "label": "Profile",
    },
  ],
});
