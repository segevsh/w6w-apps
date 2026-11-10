import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "refund-created",
  title: "Refund Created",
  description: "Fires when a refund is created. The run gets the event and the Refund.",
  events: ["refund.created"],
  sampleObject: {
    id: "re_3Nq0Za",
    object: "refund",
    status: "pending",
    amount: 500,
    currency: "usd",
    charge: "ch_3Nq0Za",
  },
});

export default trigger;
