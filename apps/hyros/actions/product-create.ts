import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HyrosClient } from "../lib/client.ts";

interface Input {
  name: string;
  price: number;
  category?: string;
  packages?: string;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a product; its tag is derived from the name.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "price", label: "Price", type: "number", required: true },
    { key: "category", label: "Category", type: "string" },
    {
      key: "packages",
      label: "Packages",
      type: "string",
      hint: "Comma-separated packages the product belongs to (recurring-sale attribution).",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    const packages = csv(input.packages);
    return new HyrosClient(ctx).write("POST", "/products", {
      body: compact({
        name: input.name,
        price: input.price,
        category: input.category,
        packages: packages.length ? packages : undefined,
      }),
    });
  },
};

export default productCreate;
