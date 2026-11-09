import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-paid",
  title: "Invoice Paid",
  description:
    "Fires when an invoice is paid. The run gets the event and the Invoice: customer, amount paid and lines.",
  events: ["invoice.paid"],
  sampleObject: {
    id: "in_1Nq0Zd",
    object: "invoice",
    customer: "cus_Oa1b2c",
    amount_paid: 4900,
    currency: "usd",
    status: "paid",
  },
});

export default trigger;
