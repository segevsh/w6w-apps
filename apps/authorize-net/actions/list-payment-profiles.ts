import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "list-payment-profiles",
  "title": "List Payment Profiles",
  "description":
    "List expiring payment profiles by search type and month (YYYY-MM). Returns one page.",
  "resource": "payment-profile",
  "type": "search",
  "request": "getCustomerPaymentProfileListRequest",
  "params": [
    {
      "key": "searchType",
      "label": "Search type",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "cardsExpiringInMonth",
          "label": "cardsExpiringInMonth",
        },
      ],
    },
    {
      "key": "month",
      "label": "Month (YYYY-MM)",
      "type": "string",
      "required": true,
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
      "key": "totalNumInResultSet",
      "type": "number",
      "label": "Total num in result set",
    },
    {
      "key": "paymentProfiles",
      "type": "object",
      "label": "Payment profiles",
    },
  ],
});
