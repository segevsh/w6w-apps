import { webhookTrigger } from "../lib/triggers.ts";

/** A Customer.io reporting webhook filtered to email / opened. */
export default webhookTrigger({
  key: "email-opened",
  title: "Email Opened",
  description:
    "Fires when a recipient opens an email sent by Customer.io. The run gets the event, the customer, the recipient and the delivery.",
  objectType: "email",
  metric: "opened",
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
