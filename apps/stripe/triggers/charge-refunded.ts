import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "charge-refunded",
  title: "Charge Refunded",
  description:
    "Fires when a charge is refunded, fully or partly. The run gets the event and the Charge: amount refunded and the refunds list.",
  events: ["charge.refunded"],
  sampleObject: {
    id: "ch_3Nq0Zc",
    object: "charge",
    amount: 2000,
    amount_refunded: 500,
    currency: "usd",
    refunded: false,
  },
});

export default trigger;
