import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/productCategories/{id}` — Delete a product category. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const productCategoryDelete: ActionDefinition<Input> = {
  key: "product-category-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product Category",
  description: "Delete a product category.",
  idempotent: true,
  params: [idParam("id", "Product Category ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/productCategories/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default productCategoryDelete;
