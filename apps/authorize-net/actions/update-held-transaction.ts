import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "update-held-transaction",
  "title": "Approve or Decline Held Transaction",
  "description":
    "Approve or decline a transaction held by the fraud filters. Use heldTransactionRequest.action approve or decline and its refTransId.",
  "resource": "transaction",
  "type": "perform",
  "request": "updateHeldTransactionRequest",
  "params": [
    {
      "key": "heldTransactionRequest",
      "label": "Held transaction request",
      "type": "json",
      "required": true,
      "hint":
        "JSON object. Supported fields: action, refTransId. Nested fields are ordered automatically.",
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
      "key": "transactionResponse",
      "type": "object",
      "label": "Transaction response",
    },
  ],
});
