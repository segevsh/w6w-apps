import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-customer-profile",
  "title": "Get Customer Profile",
  "description": "Retrieve a customer profile by gateway ID, merchant customer ID or email.",
  "resource": "customer-profile",
  "type": "read",
  "request": "getCustomerProfileRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
    },
    {
      "key": "merchantCustomerId",
      "label": "Merchant customer id",
      "type": "string",
    },
    {
      "key": "email",
      "label": "Email",
      "type": "string",
    },
    {
      "key": "unmaskExpirationDate",
      "label": "Show expiration date",
      "type": "boolean",
    },
    {
      "key": "includeIssuerInfo",
      "label": "Include card issuer information",
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
      "key": "profile",
      "type": "object",
      "label": "Profile",
    },
    {
      "key": "subscriptionIds",
      "type": "object",
      "label": "Subscription ids",
    },
  ],
});
