import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "list-customer-profile-ids",
  "title": "List Customer Profile IDs",
  "description": "Retrieve the IDs of all stored customer profiles.",
  "resource": "customer-profile",
  "type": "search",
  "request": "getCustomerProfileIdsRequest",
  "params": [],
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
      "key": "ids",
      "type": "array",
      "label": "Ids",
    },
  ],
});
