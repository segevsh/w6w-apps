import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "checkout-expired",
  title: "Checkout Expired",
  description:
    "Fires when a Checkout Session expires without being completed. The run gets the event and the Checkout Session.",
  events: ["checkout.session.expired"],
  sampleObject: {
    id: "cs_sample_a1b2c3",
    object: "checkout.session",
    status: "expired",
    customer: "cus_Oa1b2c",
  },
});

export default trigger;
