import type { ActionDefinition } from "@w6w/types";
import { PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/projects` — list projects visible to the token, optionally filtered by name.
 */
interface Input {
  q?: string;
  sortBy?: string;
  page?: number;
  perPage?: number;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects visible to the token, optionally filtered by name.",
  params: [
    {
      key: "q",
      label: "Name filter",
      type: "string",
      hint: "Only supported syntax is `name:<text>`, e.g. `name:android`.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "name_asc", label: "name_asc" },
        { value: "name_desc", label: "name_desc" },
        { value: "updated_at_asc", label: "updated_at_asc" },
        { value: "updated_at_desc", label: "updated_at_desc" },
        { value: "space_asc", label: "space_asc" },
        { value: "space_desc", label: "space_desc" },
      ],
    },
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/projects`, {
      q: input.q,
      sort_by: input.sortBy,
      page: input.page,
      per_page: input.perPage,
    });
  },
};

export default projectList;
