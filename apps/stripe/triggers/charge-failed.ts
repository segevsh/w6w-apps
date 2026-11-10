import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "charge-failed",
  title: "Charge Failed",
  description:
    "Fires when a charge attempt fails. The run gets the event and the Charge with its failure code and message.",
  events: ["charge.failed"],
  sampleObject: {
    id: "ch_3Nq0Za",
    object: "charge",
    status: "failed",
    paid: false,
    amount: 2000,
    currency: "usd",
    failure_code: "card_declined",
  },
});

export default trigger;
