import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, Ds24Client } from "../lib/client.ts";

interface Input {
  data: unknown;
}

const createProduct: ActionDefinition<Input> = {
  key: "create-product",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description:
    "Create a product. Pass the product's properties as a JSON object, e.g. name_intern, name_en, currency, salespage_url, affiliate_commission.",
  idempotent: false,
  params: [
    {
      key: "data",
      label: "Product properties",
      type: "json",
      required: true,
      hint:
        'JSON object, e.g. {"name_intern":"My course","name_en":"My course","currency":"EUR"}. Keys are listed under createProduct in Digistore24\'s API reference.',
    },
  ],
  output: [
    { key: "product_id", type: "number", label: "ID of the created product" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "createProduct",
      compact({ data: asOptionalJson(input.data, "Product properties") }),
      { write: true },
    );
  },
};

export default createProduct;
