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
}

interface SpacesPage {
  spaces?: unknown[];
}

/**
 * `GET /spaces` — list spaces (the folders forms are organised into) accessible to the
 * authorized user.
 *
 * Business plan only, per Paperform's own docs.
 */
const listSpaces: ActionDefinition<Input> = {
  key: "list-spaces",
  type: "search",
  resource: "space",
  title: "List Spaces",
  description: "List spaces accessible to the authorized user. Requires the Business plan.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Search spaces by name." },
    ...paginationParams(),
  ],
  output: paginationOutput,

  async execute(input, ctx) {
    const page = await new PaperformClient(ctx).page<SpacesPage>("/spaces", {
      query: { search: input.search, ...paginationQuery(input) },
    });
    return withPagination(page.results?.spaces, page);
  },
};

export default listSpaces;
