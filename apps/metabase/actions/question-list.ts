import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient } from "../lib/client.ts";
import { cardFilterOptions } from "../lib/params.ts";

/**
 * `GET /api/card` — list saved questions.
 *
 * ## There is no pagination, and that is not an omission here
 *
 * This endpoint takes exactly two query parameters — `f` and `model_id` — and
 * returns a **bare JSON array** of every matching question. Verified live: a
 * stock instance with the sample content returned 40 objects, and adding
 * `?limit=2` changed nothing (still 40). There is no `limit`, no `offset` and no
 * total; the shape is the array itself, not the `{data, total, limit, offset}`
 * envelope that `search` and `collection-items` use.
 *
 * That matters because each element is *large*: a question carries its full
 * `dataset_query`, its `result_metadata` (per-column type inference from the
 * last run) and its `visualization_settings`. On an instance with thousands of
 * questions this is a multi-megabyte response with no way to ask for less.
 *
 * The way to get a bounded list is **`search`**, which does take `limit` and
 * `offset` and can be filtered to `models: ["card"]`. This action's hint says
 * so, rather than pretending a `limit` param exists and silently dropping it.
 *
 * ## `f` and `model_id` are a pair
 *
 * Four of the eight filter values — `table`, `database`, `using_model`,
 * `using_segment` — are meaningless without `model_id`, which supplies the id
 * being filtered *on*. Confusingly `model_id` does not mean "a Metabase model";
 * it is the generic "id of the thing named by `f`". The options list spells out
 * what each value expects, because getting it wrong is a 400 rather than an
 * empty list.
 */
interface Input {
  f?: string;
  modelId?: number;
}

const questionList: ActionDefinition<Input> = {
  key: "question-list",
  type: "search",
  resource: "question",
  title: "List Questions",
  description:
    "List saved questions. Returns every match with no pagination — use Search for a bounded, " +
    "filterable list on a large instance.",
  params: [
    {
      key: "f",
      label: "Filter",
      type: "select",
      default: "all",
      options: cardFilterOptions,
      hint: "`table`, `database`, `using_model` and `using_segment` all require Model ID.",
    },
    {
      key: "modelId",
      label: "Model ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint:
        "The id the filter is about — a table id for `table`, a database id for `database`, and " +
        "so on. Not needed for `all`, `mine`, `bookmarked` or `archived`.",
    },
  ],
  output: [
    { key: "[]", type: "array", label: "Questions — a bare array, not an envelope" },
  ],

  execute(input, ctx) {
    return new MetabaseClient(ctx).request("/api/card", {
      query: { f: input.f, model_id: input.modelId },
    });
  },
};

export default questionList;
