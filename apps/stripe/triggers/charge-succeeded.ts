import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "charge-succeeded",
  title: "Charge Succeeded",
  description: "Fires when a charge succeeds. The run gets the event and the Charge.",
  events: ["charge.succeeded"],
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
