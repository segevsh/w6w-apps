import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-created",
  title: "Invoice Created",
  description:
    "Fires when an invoice is created, still a draft. The run gets the event and the Invoice.",
  events: ["invoice.created"],
  sampleObject: {
    id: "in_1Nq0Za",
    object: "invoice",
    status: "draft",
    customer: "cus_Oa1b2c",
    amount_due: 2000,
  },
});

export default trigger;
