import type { ActionDefinition } from "@w6w/types";
import { bit, buildBody, encodeId, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/products/{id}` — Update a product.
 */
interface Input {
  id: number;
  name?: string;
  listPrice?: number;
  active?: boolean;
  categoryId?: number;
  fields?: unknown;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Update a product.",
  idempotent: true,
  params: [
    idParam("id", "Product ID"),
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "listPrice",
      "label": "List price",
      "type": "number",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
      "hint": "Upsales has no product delete; set false to disable.",
    },
    {
      "key": "categoryId",
      "label": "Category ID",
      "type": "number",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated product" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      listPrice: input.listPrice,
      active: bit(input.active),
      category: ref(input.categoryId),
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/products/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default productUpdate;
