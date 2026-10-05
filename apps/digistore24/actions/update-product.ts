import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, Ds24Client } from "../lib/client.ts";

interface Input {
  product_id: number;
  fields: unknown;
}

const updateProduct: ActionDefinition<Input> = {
  key: "update-product",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Update a product. Pass only the properties to change as a JSON object.",
  idempotent: true,
  params: [
    { key: "product_id", label: "Product ID", type: "number", required: true },
    {
      key: "fields",
      label: "Properties to change",
      type: "json",
      required: true,
      hint: 'JSON object of product properties, e.g. {"name_en":"New name","is_active":"N"}.',
    },
  ],
  output: [
    { key: "modified", type: "string", label: "Y if the product changed" },
  ],

  execute(input, ctx) {
    const fields = asOptionalJson<Record<string, unknown>>(input.fields, "Properties to change") ??
      {};
    return new Ds24Client(ctx).call(
      "updateProduct",
      compact({ product_id: input.product_id, ...fields }),
      { write: true },
    );
  },
};

export default updateProduct;
