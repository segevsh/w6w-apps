import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "create-shipping-address",
  "title": "Create Shipping Address",
  "description": "Add a shipping address to a stored customer profile.",
  "resource": "shipping-address",
  "type": "perform",
  "request": "createCustomerShippingAddressRequest",
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
        "JSON object. Supported fields: firstName, lastName, company, address, city, state, zip, country, phoneNumber, faxNumber, email. Nested fields are ordered automatically.",
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
    {
      "key": "customerProfileId",
      "type": "string",
      "label": "Customer profile ID",
    },
    {
      "key": "customerAddressId",
      "type": "string",
      "label": "Shipping address ID",
    },
  ],
});
