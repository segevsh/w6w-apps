import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "create-customer-profile",
  "title": "Create Customer Profile",
  "description":
    "Create a customer profile, optionally including payment profiles and shipping addresses. Validation mode liveMode can authorize a small validation amount.",
  "resource": "customer-profile",
  "type": "perform",
  "request": "createCustomerProfileRequest",
  "params": [
    {
      "key": "profile",
      "label": "Profile",
      "type": "json",
      "required": true,
      "secret": true,
      "hint":
        "JSON object. Supported fields: merchantCustomerId, description, email, paymentProfiles, shipToList, profileType. Nested fields are ordered automatically.",
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
      "key": "customerPaymentProfileIdList",
      "type": "array",
      "label": "Customer payment profile id list",
    },
    {
      "key": "customerShippingAddressIdList",
      "type": "array",
      "label": "Customer shipping address id list",
    },
    {
      "key": "validationDirectResponseList",
      "type": "array",
      "label": "Validation direct response list",
    },
  ],
});
