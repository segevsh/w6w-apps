import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-voided",
  title: "Invoice Voided",
  description: "Fires when an invoice is voided. The run gets the event and the Invoice.",
  events: ["invoice.voided"],
  sampleObject: {
    id: "in_1Nq0Za",
    object: "invoice",
    status: "void",
    customer: "cus_Oa1b2c",
    amount_due: 2000,
  },
});

export default trigger;
