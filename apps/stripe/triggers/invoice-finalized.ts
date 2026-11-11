import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-finalized",
  title: "Invoice Finalized",
  description:
    "Fires when an invoice is finalized and ready to be paid. The run gets the event and the Invoice.",
  events: ["invoice.finalized"],
  sampleObject: {
    id: "in_1Nq0Za",
    object: "invoice",
    status: "open",
    customer: "cus_Oa1b2c",
    amount_due: 2000,
  },
});

export default trigger;
