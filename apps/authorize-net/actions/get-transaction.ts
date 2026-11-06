import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-transaction",
  "title": "Get Transaction",
  "description":
    "Retrieve a transaction by its gateway ID or reference ID, including settlement and processor details.",
  "resource": "transaction",
  "type": "read",
  "request": "getTransactionDetailsRequest",
  "params": [
    {
      "key": "transId",
      "label": "Transaction ID",
      "type": "string",
    },
    {
      "key": "transrefId",
      "label": "Transaction reference ID",
      "type": "string",
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
      "key": "transaction",
      "type": "object",
      "label": "Transaction",
    },
    {
      "key": "clientId",
      "type": "string",
      "label": "Client id",
    },
    {
      "key": "transrefId",
      "type": "string",
      "label": "Transaction reference ID",
    },
  ],
});
