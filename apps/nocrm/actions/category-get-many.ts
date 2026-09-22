import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

interface Input {
  includeTags?: boolean;
}

/**
 * `GET /api/v2/categories` — list the account's tag categories.
 *
 * The List-the-categories table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents one optional
 * parameter: `include_tags`, default `false`, "Include the supertags under each
 * categories returned". The document's own sample response is the
 * `include_tags: true` shape — each category carries a `supertags` array, and a
 * supertag is what the rest of this app calls a predefined tag.
 *
 * The parameter travels as a query string, so it is sent only when the caller
 * sets it: `false` is the vendor's default and the query builder keeps an
 * explicit `false`, which the API accepts as documented.
 */
const categoryGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "category-get-many",
  type: "search",
  resource: "category",
  title: "List Categories",
  description:
    "List the account's tag categories, optionally with each category's predefined tags " +
    "(GET /api/v2/categories).",
  params: [
    {
      key: "includeTags",
      label: "Include predefined tags",
      type: "boolean",
      hint: "Include the supertags under each category. The document's default is `false`.",
    },
  ],
  output: listOutput("Categories"),

  execute(input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/categories`, {
      query: { include_tags: input.includeTags },
    });
  },
};

export default categoryGetMany;
