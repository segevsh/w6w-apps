import { webhookTrigger } from "../lib/triggers.ts";

/** A Customer.io reporting webhook. */
export default webhookTrigger({
  key: "reporting-event",
  title: "Reporting Webhook Event",
  description:
    "Fires on any Customer.io reporting-webhook event, optionally narrowed to one object type and metric. The run gets the event and its data.",
  sample: {
    eventId: "01E4C8AY5K21N2QNRBD9YXJ13Z",
    objectType: "email",
    metric: "opened",
    timestamp: 1585254331,
    customerId: "abcd-1234",
    recipient: "test@example.com",
    deliveryId: "RPILAgABcRhIBqSp7kiPekGBIeVh",
    data: {
      customer_id: "abcd-1234",
      delivery_id: "RPILAgABcRhIBqSp7kiPekGBIeVh",
      recipient: "test@example.com",
      subject: "hello",
    },
  },
});
