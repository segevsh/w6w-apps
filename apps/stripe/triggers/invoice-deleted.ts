import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "invoice-deleted",
  title: "Invoice Deleted",
  description:
    "Fires when a draft invoice is deleted. The run gets the event and the deleted Invoice.",
  events: ["invoice.deleted"],
  sampleObject: { id: "in_1Nq0Za", object: "invoice", status: "draft", customer: "cus_Oa1b2c" },
});

export default trigger;
