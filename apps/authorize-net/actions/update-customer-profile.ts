import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "update-customer-profile",
  "title": "Update Customer Profile",
  "description": "Update customer profile metadata. Include customerProfileId inside profile.",
  "resource": "customer-profile",
  "type": "perform",
  "request": "updateCustomerProfileRequest",
  "params": [
    {
      "key": "profile",
      "label": "Profile",
      "type": "json",
      "required": true,
      "secret": true,
      "hint":
        "JSON object. Supported fields: merchantCustomerId, description, email, customerProfileId, profileType. Nested fields are ordered automatically.",
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
