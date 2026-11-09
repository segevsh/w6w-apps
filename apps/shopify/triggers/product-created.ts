import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-created",
  title: "Product Created",
  description:
    "Fires when a product is created. The run gets the product with its variants and images.",
  topics: ["products/create"],
  sampleResource: { id: 632910392, title: "IPod Nano - 8GB", vendor: "Apple", status: "active" },
});

export default trigger;
