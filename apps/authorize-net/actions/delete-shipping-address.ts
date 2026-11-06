import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "delete-shipping-address",
  "title": "Delete Shipping Address",
  "description": "Delete one shipping address from a customer profile.",
  "resource": "shipping-address",
  "type": "perform",
  "request": "deleteCustomerShippingAddressRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "customerAddressId",
      "label": "Shipping address ID",
      "type": "string",
      "required": true,
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
  ],
});
