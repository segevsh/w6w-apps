import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/projects/{projectId}/keys` — list a project's translation keys, optionally filtered by a search query.
 */
interface Input {
  projectId: string;
  branch?: string;
  sort?: string;
  order?: string;
  q?: string;
  localeId?: string;
  page?: number;
  perPage?: number;
}

const keyList: ActionDefinition<Input> = {
  key: "key-list",
  type: "search",
  resource: "key",
  title: "List Keys",
  description: "List a project's translation keys, optionally filtered by a search query.",
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
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [{ value: "name", label: "name" }, { value: "created_at", label: "created_at" }, {
        value: "updated_at",
        label: "updated_at",
      }],
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ value: "asc", label: "asc" }, { value: "desc", label: "desc" }],
    },
    {
      key: "q",
      label: "Search query",
      type: "string",
      hint:
        "Key-name search with wildcards, plus qualifiers such as `tags:ui`, `ids:a,b`, `name:x`, `translated:false`. See Phrase's search-term docs.",
    },
    {
      key: "localeId",
      label: "Locale ID",
      type: "string",
      hint: "Locale used to evaluate translation-state qualifiers in `q`.",
    },
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/projects/${encodeId(input.projectId)}/keys`, {
      branch: input.branch,
      sort: input.sort,
      order: input.order,
      q: input.q,
      locale_id: input.localeId,
      page: input.page,
      per_page: input.perPage,
    });
  },
};

export default keyList;
