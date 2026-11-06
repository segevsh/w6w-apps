import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "list-batch-transactions",
  "title": "List Batch Transactions",
  "description":
    "List transactions in a settlement batch. Use paging.limit and the one-based paging.offset; the action returns one page.",
  "resource": "transaction",
  "type": "search",
  "request": "getTransactionListRequest",
  "params": [
    {
      "key": "batchId",
      "required": true,
      "label": "Batch id",
      "type": "string",
    },
    {
      "key": "sorting",
      "label": "Sorting",
      "type": "json",
      "hint": "Sorting object with orderBy and orderDescending.",
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
      "key": "transactions",
      "type": "array",
      "label": "Transactions",
    },
    {
      "key": "totalNumInResultSet",
      "type": "number",
      "label": "Total num in result set",
    },
  ],
});
