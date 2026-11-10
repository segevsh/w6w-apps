import { webhookTrigger } from "../lib/triggers.ts";

/** A Customer.io reporting webhook filtered to customer / unsubscribed. */
export default webhookTrigger({
  key: "customer-unsubscribed",
  title: "Customer Unsubscribed",
  description:
    "Fires when a person unsubscribes in Customer.io. The run gets the event and the customer's email address.",
  objectType: "customer",
  metric: "unsubscribed",
  sample: {
    eventId: "01E4C4CT6YDC7Y5M7FE1GWWPQJ",
    objectType: "customer",
    metric: "unsubscribed",
    timestamp: 1585250199,
    customerId: "0200102",
    recipient: "test@example.com",
    deliveryId: null,
    data: {
      customer_id: "0200102",
      identifiers: { id: "0200102" },
      email_address: "test@example.com",
    },
  },
});
