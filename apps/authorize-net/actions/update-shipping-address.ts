import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "update-shipping-address",
  "title": "Update Shipping Address",
  "description": "Update a stored shipping address. Include customerAddressId inside address.",
  "resource": "shipping-address",
  "type": "perform",
  "request": "updateCustomerShippingAddressRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "address",
      "label": "Address",
      "type": "json",
      "required": true,
      "hint":
        "JSON object. Supported fields: firstName, lastName, company, address, city, state, zip, country, phoneNumber, faxNumber, email, customerAddressId. Nested fields are ordered automatically.",
    },
    {
      "key": "defaultShippingAddress",
      "label": "Default shipping address",
      "type": "boolean",
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
