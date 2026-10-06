import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/productCategories/{id}` — Update a product category.
 */
interface Input {
  id: number;
  name?: string;
  fields?: unknown;
}

const productCategoryUpdate: ActionDefinition<Input> = {
  key: "product-category-update",
  type: "perform",
  resource: "product",
  title: "Update Product Category",
  description: "Update a product category.",
  idempotent: true,
  params: [
    idParam("id", "Product Category ID"),
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated product category" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data(
      "PUT",
      `/productCategories/${encodeId(input.id)}`,
      { body },
    );
    return { data };
  },
};

export default productCategoryUpdate;
