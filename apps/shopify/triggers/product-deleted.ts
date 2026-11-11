import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-deleted",
  title: "Product Deleted",
  description: "Fires when a product is deleted. The run gets the id of the deleted product.",
  topics: ["products/delete"],
  sampleResource: { id: 632910392 },
});

export default trigger;
