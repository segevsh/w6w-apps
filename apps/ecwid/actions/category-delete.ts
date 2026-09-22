import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId } from "../lib/client.ts";
import { categoryIdParam } from "../lib/params.ts";

/**
 * `DELETE /categories/{categoryId}` — delete a category.
 *
 * Answers `{"deleteCount": 1}` when the category was deleted and
 * `{"deleteCount": 0}` when it was not. Deleting a category does **not** delete
 * its products — they stay in the catalog and lose the assignment — so a
 * workflow that means "remove this category and everything in it" has to delete
 * the products itself, which is a deliberate gap rather than an oversight.
 *
 * Idempotent in the sense the runtime cares about: the same category is gone
 * after one call and after five. A repeat call answers `404 CATEGORIES_NOT_FOUND`.
 */
interface Input {
  categoryId: string;
}

const categoryDelete: ActionDefinition<Input> = {
  key: "category-delete",
  type: "perform",
  resource: "category",
  title: "Delete Category",
  description:
    "Delete a category. Products assigned to it are kept and simply lose the assignment.",
  idempotent: true,
  params: [categoryIdParam],
  output: [
    { key: "deleteCount", type: "number", label: "1 when the category was deleted, 0 otherwise" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json(`/categories/${encodeId(input.categoryId)}`, {
      method: "DELETE",
    });
  },
};

export default categoryDelete;
