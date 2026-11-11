import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "charge-updated",
  title: "Charge Updated",
  description:
    "Fires when a charge is updated, for example its description or metadata. The run gets the event and the Charge after the change, and previousAttributes holds the old values.",
  events: ["charge.updated"],
  sampleObject: {
    id: "ch_3Nq0Za",
    object: "charge",
    status: "succeeded",
    paid: true,
    amount: 2000,
    currency: "usd",
  },
});

export default trigger;
