import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-updated",
  title: "Product Updated",
  description: "Fires when a product changes. The run gets the product as it is now.",
  topics: ["products/update"],
  sampleResource: { id: 632910392, title: "IPod Nano - 8GB", vendor: "Apple", status: "active" },
});

export default trigger;
