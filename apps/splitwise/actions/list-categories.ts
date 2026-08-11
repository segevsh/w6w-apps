import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_categories` — the ids `category_id` will accept.
 *
 * ## The tree is two levels, and only the leaves are usable
 *
 * > There are parent categories that represent groups of categories with
 * > subcategories for more specific categorization. **When creating expenses,
 * > you must use a subcategory, not a parent category.** If you intend for an
 * > expense to be represented by the parent category and nothing more specific,
 * > please use the "Other" subcategory.
 *
 * The response is a flat array of `parent_category` objects, each with its own
 * `id` and a `subcategories` array — and the parent ids look exactly like the
 * child ids, so passing `1` ("Utilities") to Create Expense is an easy mistake
 * that the API rejects. This action returns the raw tree under `categories`
 * *and* a flattened `subcategories` list, each entry carrying `parent_id` and
 * `parent_name`, so a workflow can pick a usable id without walking the tree
 * itself.
 *
 * ## `requiresAuth: false`, measured
 *
 * Answers 200 with the full payload and no credential (measured 2026-08-11).
 * See `list-currencies.ts` for why that also disqualifies it as an auth probe.
 */
interface Category {
  id?: number;
  name?: string;
  icon?: string;
  subcategories?: Category[];
}

const listCategories: ActionDefinition<Record<string, never>> = {
  key: "list-categories",
  type: "read",
  resource: "reference",
  title: "List Categories",
  description:
    "Splitwise's expense categories, as the raw parent tree plus a flattened list of the " +
    "subcategories — only a subcategory id is valid on an expense.",
  requiresAuth: false,
  params: [],
  output: [
    { key: "categories", type: "array", label: "Parent categories, each with subcategories" },
    { key: "subcategories", type: "array", label: "Flattened usable categories" },
  ],

  async execute(_input, ctx) {
    const body = await new SplitwiseClient(ctx).request("/get_categories");
    const categories = pick<Category[]>(body, "categories", []);

    const subcategories = categories.flatMap((parent) =>
      (parent?.subcategories ?? []).map((child) => ({
        id: child?.id,
        name: child?.name,
        icon: child?.icon,
        parent_id: parent?.id,
        parent_name: parent?.name,
      }))
    );

    return { categories, subcategories };
  },
};

export default listCategories;
