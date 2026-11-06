import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "delete-customer-profile",
  "title": "Delete Customer Profile",
  "description":
    "Delete a stored customer profile and its payment profiles and shipping addresses.",
  "resource": "customer-profile",
  "type": "perform",
  "request": "deleteCustomerProfileRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
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
