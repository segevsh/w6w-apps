import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "validate-payment-profile",
  "title": "Validate Payment Profile",
  "description":
    "Validate a stored payment profile. liveMode can create a small authorization; testMode does not contact the processor.",
  "resource": "payment-profile",
  "type": "perform",
  "request": "validateCustomerPaymentProfileRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "customerPaymentProfileId",
      "label": "Payment profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "customerShippingAddressId",
      "label": "Customer shipping address id",
      "type": "string",
    },
    {
      "key": "cardCode",
      "secret": true,
      "label": "Card code",
      "type": "string",
    },
    {
      "key": "validationMode",
      "label": "Validation mode",
      "type": "select",
      "required": true,
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
      "key": "directResponse",
      "type": "string",
      "label": "Direct response",
    },
  ],
});
