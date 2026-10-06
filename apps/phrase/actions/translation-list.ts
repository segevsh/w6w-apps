import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/projects/{projectId}/translations` — list translations in a project, filtered by key, locale or content.
 */
interface Input {
  projectId: string;
  branch?: string;
  keyId?: string;
  localeId?: string;
  sort?: string;
  order?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

const translationList: ActionDefinition<Input> = {
  key: "translation-list",
  type: "search",
  resource: "translation",
  title: "List Translations",
  description: "List translations in a project, filtered by key, locale or content.",
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
    { key: "keyId", label: "Key ID", type: "string" },
    { key: "localeId", label: "Locale ID or code", type: "string" },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [{ value: "key_name", label: "key_name" }, {
        value: "created_at",
        label: "created_at",
      }, { value: "updated_at", label: "updated_at" }],
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
      hint: "Content search with wildcards and qualifiers such as `unverified:true`.",
    },
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/projects/${encodeId(input.projectId)}/translations`, {
      branch: input.branch,
      key_id: input.keyId,
      locale_id: input.localeId,
      sort: input.sort,
      order: input.order,
      q: input.q,
      page: input.page,
      per_page: input.perPage,
    });
  },
};

export default translationList;
