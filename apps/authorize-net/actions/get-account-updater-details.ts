import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-account-updater-details",
  "title": "Get Account Updater Details",
  "description":
    "Retrieve Account Updater changes for a month (YYYY-MM), optionally filtered by change type. Returns one page.",
  "resource": "account-updater",
  "type": "search",
  "request": "getAUJobDetailsRequest",
  "params": [
    {
      "key": "month",
      "label": "Month (YYYY-MM)",
      "type": "string",
      "required": true,
    },
    {
      "key": "modifiedTypeFilter",
      "label": "Modified type filter",
      "type": "select",
      "options": [
        {
          "value": "all",
          "label": "all",
        },
        {
          "value": "updates",
          "label": "updates",
        },
        {
          "value": "deletes",
          "label": "deletes",
        },
      ],
    },
    {
      "key": "paging",
      "label": "Paging",
      "type": "json",
      "hint": 'One page per call. {"limit":100,"offset":1}; offset is a one-based page number.',
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
      "key": "totalNumInResultSet",
      "type": "number",
      "label": "Total num in result set",
    },
    {
      "key": "auDetails",
      "type": "object",
      "label": "Au details",
    },
  ],
});
