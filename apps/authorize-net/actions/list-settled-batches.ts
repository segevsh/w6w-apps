import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "list-settled-batches",
  "title": "List Settled Batches",
  "description":
    "List settlement batches for a date range of at most 31 days, optionally including statistics.",
  "resource": "batch",
  "type": "search",
  "request": "getSettledBatchListRequest",
  "params": [
    {
      "key": "includeStatistics",
      "label": "Include statistics",
      "type": "boolean",
    },
    {
      "key": "firstSettlementDate",
      "label": "First settlement date",
      "type": "string",
      "hint":
        "ISO 8601 date-time, for example 2026-11-01T00:00:00Z. The date range must not exceed 31 days.",
    },
    {
      "key": "lastSettlementDate",
      "label": "Last settlement date",
      "type": "string",
      "hint":
        "ISO 8601 date-time, for example 2026-11-01T00:00:00Z. The date range must not exceed 31 days.",
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
      "key": "batchList",
      "type": "array",
      "label": "Batch list",
    },
  ],
});
