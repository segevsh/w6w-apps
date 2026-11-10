import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "refund-updated",
  title: "Refund Updated",
  description:
    "Fires when a refund is updated, for example when it succeeds or fails. The run gets the event and the Refund.",
  events: ["refund.updated"],
  sampleObject: {
    id: "re_3Nq0Za",
    object: "refund",
    status: "succeeded",
    amount: 500,
    currency: "usd",
    charge: "ch_3Nq0Za",
  },
});

export default trigger;
