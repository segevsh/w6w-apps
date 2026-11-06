import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "create-payment-profile",
  "title": "Create Payment Profile",
  "description":
    "Add a stored card or bank account payment profile to a customer. liveMode validation may create a small authorization.",
  "resource": "payment-profile",
  "type": "perform",
  "request": "createCustomerPaymentProfileRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "paymentProfile",
      "label": "Payment profile",
      "type": "json",
      "required": true,
      "secret": true,
      "hint":
        "JSON object. Supported fields: customerType, billTo, payment, driversLicense, taxId, defaultPaymentProfile, subsequentAuthInformation, excludeFromAccountUpdater. Nested fields are ordered automatically.",
    },
    {
      "key": "validationMode",
      "label": "Validation mode",
      "type": "select",
      "options": [
        {
          "value": "none",
          "label": "none",
        },
        {
          "value": "testMode",
          "label": "testMode",
        },
        {
          "value": "liveMode",
          "label": "liveMode",
        },
        {
          "value": "oldLiveMode",
          "label": "oldLiveMode",
        },
      ],
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
      "key": "customerProfileId",
      "type": "string",
      "label": "Customer profile ID",
    },
    {
      "key": "customerPaymentProfileId",
      "type": "string",
      "label": "Payment profile ID",
    },
    {
      "key": "validationDirectResponse",
      "type": "string",
      "label": "Validation direct response",
    },
  ],
});
