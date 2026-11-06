import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "list-customer-transactions",
  "title": "List Customer Transactions",
  "description":
    "List transactions for a customer profile, optionally restricted to one payment profile. Returns one page.",
  "resource": "transaction",
  "type": "search",
  "request": "getTransactionListForCustomerRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "customerPaymentProfileId",
      "label": "Payment profile ID",
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
      "key": "messages",
      "type": "object",
      "label": "API messages",
    },
  ],
});
