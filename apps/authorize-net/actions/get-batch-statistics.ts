import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-batch-statistics",
  "title": "Get Batch Statistics",
  "description": "Retrieve settlement batch statistics, including payment method totals.",
  "resource": "batch",
  "type": "read",
  "request": "getBatchStatisticsRequest",
  "params": [
    {
      "key": "batchId",
      "label": "Batch id",
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
      "key": "batch",
      "type": "object",
      "label": "Batch",
    },
  ],
});
