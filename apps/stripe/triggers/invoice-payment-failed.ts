import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-payment-failed",
  title: "Invoice Payment Failed",
  description:
    "Fires when paying an invoice fails. The run gets the event and the Invoice: customer, amount due and attempt count.",
  events: ["invoice.payment_failed"],
  sampleObject: {
    id: "in_1Nq0Ze",
    object: "invoice",
    customer: "cus_Oa1b2c",
    amount_due: 4900,
    attempt_count: 1,
    status: "open",
  },
});

export default trigger;
