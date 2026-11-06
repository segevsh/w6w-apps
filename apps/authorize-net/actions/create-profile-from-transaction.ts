import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "create-profile-from-transaction",
  "title": "Create Profile from Transaction",
  "description": "Create a stored customer profile from an existing successful transaction.",
  "resource": "customer-profile",
  "type": "perform",
  "request": "createCustomerProfileFromTransactionRequest",
  "params": [
    {
      "key": "transId",
      "label": "Transaction ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "customer",
      "label": "Customer",
      "type": "json",
      "hint":
        "JSON object. Supported fields: merchantCustomerId, description, email. Nested fields are ordered automatically.",
    },
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
    },
    {
      "key": "defaultPaymentProfile",
      "label": "Default payment profile",
      "type": "boolean",
    },
    {
      "key": "defaultShippingAddress",
      "label": "Default shipping address",
      "type": "boolean",
    },
    {
      "key": "profileType",
      "label": "Profile type",
      "type": "select",
      "options": [
        {
          "value": "regular",
          "label": "regular",
        },
        {
          "value": "guest",
          "label": "guest",
        },
      ],
    },
  ],
  "output": [
    {
      "key": "messages",
      "type": "object",
      "label": "API messages",
    },
  ],
});
