import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-shipping-address",
  "title": "Get Shipping Address",
  "description": "Retrieve one shipping address from a customer profile.",
  "resource": "shipping-address",
  "type": "read",
  "request": "getCustomerShippingAddressRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "customerAddressId",
      "required": true,
      "label": "Shipping address ID",
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
      "key": "defaultShippingAddress",
      "type": "boolean",
      "label": "Default shipping address",
    },
    {
      "key": "address",
      "type": "object",
      "label": "Address",
    },
    {
      "key": "subscriptionIds",
      "type": "object",
      "label": "Subscription ids",
    },
  ],
});
