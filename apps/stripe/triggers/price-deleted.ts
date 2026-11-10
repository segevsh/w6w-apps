import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "price-deleted",
  title: "Price Deleted",
  description: "Fires when a price is deleted. The run gets the event and the deleted Price.",
  events: ["price.deleted"],
  sampleObject: { id: "price_1Nq0Za", object: "price", deleted: true },
});

export default trigger;
