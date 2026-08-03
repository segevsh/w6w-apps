import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { categoryOutput } from "../lib/params.ts";

/**
 * `GET /categories.json` — every category the credential can see.
 *
 * This is the lookup table the rest of the app needs: `topic-create` and
 * `topic-update` take a numeric `category` id, and this is where those numbers
 * come from.
 *
 * `include_subcategories` is declared in the reference as a boolean whose enum
 * is `[true]` — i.e. the only value that means anything is `true`, and the
 * parameter's absence is the "no" case. So it is sent only when switched on
 * rather than as `include_subcategories=false`, which the endpoint does not
 * document and might interpret as truthy.
 *
 * The response nests under `category_list.categories`. It is returned whole
 * rather than unwrapped, because `category_list` also carries
 * `can_create_category` and the pagination flags a caller may want.
 */
interface Input {
  includeSubcategories?: boolean;
}

const categoryList: ActionDefinition<Input> = {
  key: "category-list",
  type: "search",
  resource: "category",
  title: "List Categories",
  description: "Every category visible to the connection, with their numeric ids.",
  params: [
    {
      key: "includeSubcategories",
      label: "Include subcategories",
      type: "boolean",
      hint: "Nests each category's children under `subcategory_list`.",
    },
  ],
  output: [
    { key: "category_list", type: "object", label: "Category list" },
    { key: "category_list.categories", type: "array", label: "Categories" },
    ...categoryOutput.map((f) => ({
      ...f,
      key: `category_list.categories[].${f.key}`,
    })),
  ],

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/categories.json", {
      // The endpoint's enum for this flag is `[true]` — only its presence means
      // anything, so `false` is sent as absence rather than as the string.
      query: { include_subcategories: input.includeSubcategories ? true : undefined },
    });
  },
};

export default categoryList;
