import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-payment-profile",
  "title": "Get Payment Profile",
  "description": "Retrieve a payment profile with masked payment details.",
  "resource": "payment-profile",
  "type": "read",
  "request": "getCustomerPaymentProfileRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "customerPaymentProfileId",
      "required": true,
      "label": "Payment profile ID",
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
      "key": "paymentProfile",
      "type": "object",
      "label": "Payment profile",
    },
  ],
});
