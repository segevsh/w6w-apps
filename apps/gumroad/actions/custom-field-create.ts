import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `POST /v2/products/:product_id/custom_fields`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  name: string;
  required?: boolean;
}

const customFieldCreate: ActionDefinition<Input> = {
  key: "custom-field-create",
  type: "perform",
  resource: "custom-field",
  title: "Create Custom Field",
  description: "Add a checkout field to a product. Needs the `edit_products` or `account` scope.",
  idempotent: false,
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }, {
    "key": "name",
    "label": "Field name",
    "type": "string",
    "required": true,
    "hint": "The field's name is its identifier.",
  }, { "key": "required", "label": "Required", "type": "boolean" }],
  output: [{ "key": "name", "type": "string", "label": "Name" }, {
    "key": "required",
    "type": "string",
    "label": "Whether required",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "POST",
      `/products/${seg(input.productId)}/custom_fields`,
      {
        form: { name: input.name, required: input.required },
      },
    );
    return body.custom_field;
  },
};

export default customFieldCreate;
