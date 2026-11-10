import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-updated",
  title: "Invoice Updated",
  description:
    "Fires when an invoice is updated. The run gets the event and the Invoice after the change, and previousAttributes holds the old values.",
  events: ["invoice.updated"],
  sampleObject: {
    id: "in_1Nq0Za",
    object: "invoice",
    status: "open",
    customer: "cus_Oa1b2c",
    amount_due: 2000,
  },
});

export default trigger;
