import { telegramTrigger } from "../lib/triggers.ts";

const shippingQuery = telegramTrigger({
  key: "shipping-query",
  title: "Shipping Query",
  description:
    "Fires when a buyer picks a shipping address for an invoice with a flexible price. The run gets the sender and the raw update, which holds the address and the invoice payload.",
  allowedUpdates: ["shipping_query"],
  sample: {
    "updateId": 10006,
    "updateType": "shipping_query",
    "chatId": null,
    "fromId": "1111111",
    "messageId": null,
    "text": null,
    "date": null,
    "update": {
      "update_id": 10006,
      "shipping_query": {
        "id": "8",
        "from": {
          "id": 1111111,
          "is_bot": false,
          "first_name": "Test",
        },
        "invoice_payload": "order-1",
        "shipping_address": {
          "country_code": "US",
          "state": "NY",
          "city": "New York",
          "street_line1": "1 Main St",
          "street_line2": "",
          "post_code": "10001",
        },
      },
    },
  },
});

export default shippingQuery;
