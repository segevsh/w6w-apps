import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "list-unsettled-transactions",
  "title": "List Unsettled Transactions",
  "description":
    "List unsettled transactions. Use paging.limit and the one-based paging.offset; the action returns one page.",
  "resource": "transaction",
  "type": "search",
  "request": "getUnsettledTransactionListRequest",
  "params": [
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "any",
          "label": "any",
        },
        {
          "value": "pendingApproval",
          "label": "pendingApproval",
        },
      ],
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
