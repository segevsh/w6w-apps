import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-deleted",
  title: "Product Deleted",
  description: "Fires when a product is deleted. The run gets the event and the deleted Product.",
  events: ["product.deleted"],
  sampleObject: { id: "prod_Oa1b2c", object: "product", deleted: true },
});

export default trigger;
