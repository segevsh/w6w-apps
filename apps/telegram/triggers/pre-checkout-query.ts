import { telegramTrigger } from "../lib/triggers.ts";

const preCheckoutQuery = telegramTrigger({
  key: "pre-checkout-query",
  title: "Pre-Checkout Query",
  description:
    "Fires when a buyer confirms an invoice, just before payment. The run gets the sender and the raw update, which holds the currency, total and invoice payload; the bot must answer within 10 seconds.",
  allowedUpdates: ["pre_checkout_query"],
  sample: {
    "updateId": 10007,
    "updateType": "pre_checkout_query",
    "chatId": null,
    "fromId": "1111111",
    "messageId": null,
    "text": null,
    "date": null,
    "update": {
      "update_id": 10007,
      "pre_checkout_query": {
        "id": "9",
        "from": {
          "id": 1111111,
          "is_bot": false,
          "first_name": "Test",
        },
        "currency": "USD",
        "total_amount": 1500,
        "invoice_payload": "order-1",
      },
    },
  },
});

export default preCheckoutQuery;
