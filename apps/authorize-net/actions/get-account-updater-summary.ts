import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-account-updater-summary",
  "title": "Get Account Updater Summary",
  "description":
    "Retrieve Account Updater job counts for a month (YYYY-MM). Requires Account Updater enrollment.",
  "resource": "account-updater",
  "type": "read",
  "request": "getAUJobSummaryRequest",
  "params": [
    {
      "key": "month",
      "label": "Month (YYYY-MM)",
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
    {
      "key": "auSummary",
      "type": "array",
      "label": "Au summary",
    },
  ],
});
