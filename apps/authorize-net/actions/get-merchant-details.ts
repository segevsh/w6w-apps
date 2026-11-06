import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-merchant-details",
  "title": "Get Merchant Details",
  "description": "Retrieve gateway merchant configuration and supported payment types.",
  "resource": "merchant",
  "type": "read",
  "request": "getMerchantDetailsRequest",
  "params": [],
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
      "key": "isTestMode",
      "type": "boolean",
      "label": "Is test mode",
    },
    {
      "key": "processors",
      "type": "array",
      "label": "Processors",
    },
    {
      "key": "merchantName",
      "type": "string",
      "label": "Merchant name",
    },
    {
      "key": "gatewayId",
      "type": "string",
      "label": "Gateway id",
    },
    {
      "key": "marketTypes",
      "type": "array",
      "label": "Market types",
    },
    {
      "key": "productCodes",
      "type": "array",
      "label": "Product codes",
    },
    {
      "key": "paymentMethods",
      "type": "array",
      "label": "Payment methods",
    },
    {
      "key": "currencies",
      "type": "array",
      "label": "Currencies",
    },
    {
      "key": "publicClientKey",
      "type": "string",
      "label": "Public client key",
    },
    {
      "key": "businessInformation",
      "type": "object",
      "label": "Business information",
    },
    {
      "key": "merchantTimeZone",
      "type": "string",
      "label": "Merchant time zone",
    },
    {
      "key": "contactDetails",
      "type": "array",
      "label": "Contact details",
    },
  ],
});
