import type { ActionDefinition } from "@w6w/types";
import { buildBody, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/productCategories` — Create a product category.
 */
interface Input {
  name: string;
  fields?: unknown;
}

const productCategoryCreate: ActionDefinition<Input> = {
  key: "product-category-create",
  type: "perform",
  resource: "product",
  title: "Create Product Category",
  description: "Create a product category.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created product category" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
    });
    const data = await new UpsalesClient(ctx).data("POST", "/productCategories", { body });
    return { data };
  },
};

export default productCategoryCreate;
