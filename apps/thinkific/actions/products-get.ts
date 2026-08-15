import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /products/{id}` — a single Product (Course or Bundle wrapper) by id. */
const productsGet: ActionDefinition<Input> = {
  key: "products-get",
  type: "read",
  resource: "products",
  title: "Get Product",
  description: "Fetch a single Product by id.",
  params: [idParam("Product")],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "productable_id", type: "number", label: "Underlying Course/Bundle ID" },
    { key: "productable_type", type: "string", label: '"Course" or "Bundle"' },
    { key: "status", type: "string", label: '"published" or "draft"' },
    {
      key: "price",
      type: "number",
      label: "Price (deprecated by the vendor — see product_prices)",
    },
    { key: "product_prices", type: "array", label: "Product Price objects" },
    { key: "private", type: "boolean", label: "Private (manual enrollment only)" },
    { key: "hidden", type: "boolean", label: "Hidden from site pages" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).json(`/products/${encodeURIComponent(input.id)}`);
  },
};

export default productsGet;
