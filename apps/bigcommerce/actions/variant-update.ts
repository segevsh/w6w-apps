import type { ActionDefinition } from "@w6w/types";
import { asJson, BigCommerceClient, encodeId } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

/**
 * `PUT /v3/catalog/products/{product_id}/variants/{variant_id}` — update one
 * variant's price, SKU, dimensions or stock.
 *
 * `inventory_level` is writable here, and that is the one field worth a warning:
 * it sets an **absolute** level for the variant's default allotment. For an
 * order-driven change ("two were sold") use `inventory-adjust-relative`, which is
 * what the vendor recommends for exactly that case — a lost race between two
 * absolute writes silently discards one of them.
 */
interface Input {
  productId: number;
  variantId: number;
  fields: unknown;
}

const variantUpdate: ActionDefinition<Input> = {
  key: "variant-update",
  type: "perform",
  resource: "variant",
  title: "Update Variant",
  description: "Apply a partial update to one variant — price, SKU, weight, UPC or stock level.",
  idempotent: true,
  params: [
    productIdParam,
    {
      key: "variantId",
      label: "Variant ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "fields",
      label: "Fields to change",
      type: "json",
      required: true,
      placeholder: '{ "price": 24.5, "inventory_level": 12 }',
      hint: "A partial variant object. `inventory_level` here is absolute — for a delta, use " +
        "Adjust Inventory (Relative) instead.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Variant ID" }],

  async execute(input, ctx) {
    const body = asJson<Record<string, unknown>>(input.fields, "Fields to change");
    return await new BigCommerceClient(ctx).v3(
      `/catalog/products/${encodeId(input.productId)}/variants/${encodeId(input.variantId)}`,
      { method: "PUT", body },
    );
  },
};

export default variantUpdate;
