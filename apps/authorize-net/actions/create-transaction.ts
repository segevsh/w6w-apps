import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "create-transaction",
  "title": "Create Transaction",
  "description":
    "Submit a transaction request, including card, bank account, Accept.js opaque data or saved profile payments. All nested keys are ordered automatically. Response code 4 means held for review; do not retry as a new charge.",
  "resource": "transaction",
  "type": "perform",
  "request": "createTransactionRequest",
  "params": [
    {
      "key": "transactionRequest",
      "label": "Transaction request",
      "type": "json",
      "required": true,
      "secret": true,
      "hint":
        "JSON object. Supported fields: transactionType, amount, currencyCode, payment, profile, solution, callId, terminalNumber, authCode, refTransId, splitTenderId, order, lineItems, tax, duty, shipping, taxExempt, poNumber, customer, billTo, shipTo, customerIP, cardholderAuthentication, retail, employeeId, transactionSettings, userFields, surcharge, merchantDescriptor, subMerchant, tip, processingOptions, subsequentAuthInformation, otherTax, shipFrom, authorizationIndicatorType, tapToPhone, debtRepaymentIndicator, purchaseLevel, aftInformation, discount. Nested fields are ordered automatically.",
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
    {
      "key": "profileResponse",
      "type": "object",
      "label": "Profile response",
    },
  ],
});
