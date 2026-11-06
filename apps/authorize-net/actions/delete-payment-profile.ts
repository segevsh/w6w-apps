import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "delete-payment-profile",
  "title": "Delete Payment Profile",
  "description": "Delete one stored customer payment profile.",
  "resource": "payment-profile",
  "type": "perform",
  "request": "deleteCustomerPaymentProfileRequest",
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
  ],
});
