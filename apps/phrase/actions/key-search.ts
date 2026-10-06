import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `POST /v2/projects/{projectId}/keys/search` — search keys with a query in the request body (for queries too long for a URL).
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

const keySearch: ActionDefinition<Input> = {
  key: "key-search",
  type: "search",
  resource: "key",
  title: "Search Keys",
  description: "Search keys with a query in the request body (for queries too long for a URL).",
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
    { key: "q", label: "Search query", type: "string", hint: "Same syntax as List Keys." },
    { key: "localeId", label: "Locale ID", type: "string" },
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/projects/${encodeId(input.projectId)}/keys/search`, {
      page: input.page,
      per_page: input.perPage,
    }, {
      method: "POST",
      body: {
        branch: input.branch,
        sort: input.sort,
        order: input.order,
        q: input.q,
        locale_id: input.localeId,
      },
    });
  },
};

export default keySearch;
