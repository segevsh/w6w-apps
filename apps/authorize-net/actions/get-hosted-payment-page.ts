import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-hosted-payment-page",
  "title": "Get Hosted Payment Page Token",
  "description":
    "Obtain an Accept Hosted payment form token. Submit the token to the hosted payment form for the same connection environment.",
  "resource": "hosted-form",
  "type": "perform",
  "request": "getHostedPaymentPageRequest",
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
    {
      "key": "hostedPaymentSettings",
      "label": "Hosted payment settings",
      "type": "json",
      "hint":
        '{"setting":[{"settingName":"documented setting name","settingValue":"string or JSON-encoded string"}]}. The value remains an opaque string.',
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
      "key": "token",
      "type": "string",
      "label": "Token",
    },
  ],
});
