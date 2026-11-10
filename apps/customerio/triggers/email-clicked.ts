import { webhookTrigger } from "../lib/triggers.ts";

/** A Customer.io reporting webhook filtered to email / clicked. */
export default webhookTrigger({
  key: "email-clicked",
  title: "Email Clicked",
  description:
    "Fires when a recipient clicks a link in an email sent by Customer.io. The run gets the event, the customer, the recipient and the clicked link.",
  objectType: "email",
  metric: "clicked",
  sample: {
    eventId: "01E4C8AY5K21N2QNRBD9YXJ13Z",
    objectType: "email",
    metric: "clicked",
    timestamp: 1585254331,
    customerId: "abcd-1234",
    recipient: "test@example.com",
    deliveryId: "RPILAgABcRhIBqSp7kiPekGBIeVh",
    data: {
      customer_id: "abcd-1234",
      delivery_id: "RPILAgABcRhIBqSp7kiPekGBIeVh",
      recipient: "test@example.com",
      subject: "hello",
      href: "https://example.com/offer",
    },
  },
});
