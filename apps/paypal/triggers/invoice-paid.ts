import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-paid",
  title: "Invoice Paid",
  description:
    "Fires when an invoice is paid. The run gets the event and the invoice details and payment.",
  eventTypes: ["INVOICING.INVOICE.PAID"],
  sampleResource: { invoice: { id: "INV2-9DRB-YTHU-2V9Q-7Q24", status: "PAID" } },
});

export default trigger;
