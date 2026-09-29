import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import {
  type PaginationInput,
  paginationOutput,
  paginationParams,
  paginationQuery,
  withPagination,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  search?: string;
  searchFields?: string[] | string;
}

interface FormsPage {
  forms?: unknown[];
}

/**
 * `GET /forms` — list all forms accessible to the authorized user.
 *
 * `search` matches the form title by default; `search_fields` opts in to also matching the
 * slug and/or custom slug — useful for finding a form when only its URL is known.
 */
const listForms: ActionDefinition<Input> = {
  key: "list-forms",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List all forms accessible to the authorized user, optionally filtered by " +
    "title/slug search.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Search forms by title." },
    {
      key: "searchFields",
      label: "Search fields",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "title", label: "Title" },
        { value: "slug", label: "Slug" },
        { value: "custom_slug", label: "Custom slug" },
      ],
      hint: "Opt in to also matching Search against the slug and/or custom slug. Defaults to " +
        "title only.",
    },
    ...paginationParams(),
  ],
  output: paginationOutput,

  async execute(input, ctx) {
    const page = await new PaperformClient(ctx).page<FormsPage>("/forms", {
      query: {
        search: input.search,
        search_fields: input.searchFields,
        ...paginationQuery(input),
      },
    });
    return withPagination(page.results?.forms, page);
  },
};

export default listForms;
