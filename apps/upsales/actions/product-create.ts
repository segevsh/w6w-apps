import type { ActionDefinition } from "@w6w/types";
import { bit, buildBody, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/products` — Create a product.
 */
interface Input {
  name: string;
  listPrice?: number;
  active?: boolean;
  categoryId?: number;
  fields?: unknown;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a product.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
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
  output: [{ key: "data", type: "object", label: "The created product" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      listPrice: input.listPrice,
      active: bit(input.active),
      category: ref(input.categoryId),
    });
    const data = await new UpsalesClient(ctx).data("POST", "/products", { body });
    return { data };
  },
};

export default productCreate;
