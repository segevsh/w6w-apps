import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/projects/{projectId}/locales` — list a project's locales.
 */
interface Input {
  projectId: string;
  branch?: string;
  q?: string;
  sortBy?: string;
  page?: number;
  perPage?: number;
}

const localeList: ActionDefinition<Input> = {
  key: "locale-list",
  type: "search",
  resource: "locale",
  title: "List Locales",
  description: "List a project's locales.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    { key: "q", label: "Name filter", type: "string", hint: "Filters on locale name." },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "name_asc", label: "name_asc" },
        { value: "name_desc", label: "name_desc" },
        { value: "default_asc", label: "default_asc" },
        { value: "default_desc", label: "default_desc" },
      ],
    },
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/projects/${encodeId(input.projectId)}/locales`, {
      branch: input.branch,
      q: input.q,
      sort_by: input.sortBy,
      page: input.page,
      per_page: input.perPage,
    });
  },
};

export default localeList;
