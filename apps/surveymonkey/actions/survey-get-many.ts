import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  title?: string;
  folderId?: string;
  startModifiedAt?: string;
  endModifiedAt?: string;
  include?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * GET /surveys — list surveys owned by or shared with the authenticated user.
 * Paginated; can be filtered by title, folder and modification window.
 */
const surveyGetMany: ActionDefinition<Input> = {
  key: "survey-get-many",
  type: "read",
  resource: "survey",
  title: "Get Many Surveys",
  description: "List surveys in the account, with optional search, folder filter and paging.",
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Return surveys whose title contains this string.",
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint: "Restrict to one folder.",
    },
    {
      key: "startModifiedAt",
      label: "Modified after",
      type: "string",
      hint: "ISO-8601 timestamp (YYYY-MM-DDTHH:MM:SS).",
    },
    {
      key: "endModifiedAt",
      label: "Modified before",
      type: "string",
      hint: "ISO-8601 timestamp (YYYY-MM-DDTHH:MM:SS).",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        'Comma-separated extra fields/filters, e.g. "response_count,date_created". Also accepts shared_with / shared_by / owned.',
    },
    { key: "page", label: "Page", type: "number", hint: "1-based page number. Default 1." },
    {
      key: "perPage",
      label: "Page size",
      type: "number",
      hint: "Items per page.",
      validation: { min: 1 },
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "title", label: "Title" },
        { value: "date_modified", label: "Date modified" },
        { value: "num_responses", label: "Number of responses" },
      ],
    },
    {
      key: "sortOrder",
      label: "Order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Surveys" },
    { key: "total", type: "number", label: "Total items" },
    { key: "page", type: "number", label: "Current page" },
    { key: "per_page", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request("/surveys", {
      query: {
        title: input.title,
        folder_id: input.folderId,
        start_modified_at: input.startModifiedAt,
        end_modified_at: input.endModifiedAt,
        include: input.include,
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
      },
    });
  },
};

export default surveyGetMany;
