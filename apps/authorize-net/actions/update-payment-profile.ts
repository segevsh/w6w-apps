import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "update-payment-profile",
  "title": "Update Payment Profile",
  "description":
    "Update a stored payment profile. Include customerPaymentProfileId inside paymentProfile.",
  "resource": "payment-profile",
  "type": "perform",
  "request": "updateCustomerPaymentProfileRequest",
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
        "JSON object. Supported fields: customerType, billTo, payment, driversLicense, taxId, defaultPaymentProfile, subsequentAuthInformation, excludeFromAccountUpdater, customerPaymentProfileId. Nested fields are ordered automatically.",
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
      "key": "validationDirectResponse",
      "type": "string",
      "label": "Validation direct response",
    },
  ],
});
