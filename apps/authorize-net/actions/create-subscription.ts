import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "create-subscription",
  "title": "Create Subscription",
  "description":
    "Create a recurring subscription with a payment schedule, amount and payment or saved profile.",
  "resource": "subscription",
  "type": "perform",
  "request": "ARBCreateSubscriptionRequest",
  "params": [
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
      "key": "subscriptionId",
      "type": "string",
      "label": "Subscription id",
    },
    {
      "key": "profile",
      "type": "object",
      "label": "Profile",
    },
  ],
});
