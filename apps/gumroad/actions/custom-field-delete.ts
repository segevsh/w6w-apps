import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `DELETE /v2/products/:product_id/custom_fields/:name`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  name: string;
}

const customFieldDelete: ActionDefinition<Input> = {
  key: "custom-field-delete",
  type: "perform",
  resource: "custom-field",
  title: "Delete Custom Field",
  description: "Permanently delete a custom field. Needs the `edit_products` or `account` scope.",
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
  }],
  output: [{ "key": "message", "type": "string", "label": "Confirmation from Gumroad" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "DELETE",
      `/products/${seg(input.productId)}/custom_fields/${seg(input.name)}`,
    );
    return { message: body.message ?? null };
  },
};

export default customFieldDelete;
