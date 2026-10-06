import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient, unset } from "../lib/client.ts";
import { formDir } from "../lib/params.ts";

interface Input {
  formDir: string;
  limit?: number;
  page?: number;
  afterDate?: string;
  beforeDate?: string;
  afterId?: number;
  beforeId?: number;
  sortId?: string;
  sortDirection?: string;
  resultsView?: string;
}

const resultList: ActionDefinition<Input> = {
  key: "result-list",
  type: "search",
  resource: "result",
  title: "List Results",
  description:
    "Get a form's submitted results, newest first by default. Use `afterId` or `afterDate` to fetch only what's new since the last run.",
  params: [
    formDir,
    {
      key: "afterId",
      label: "After result ID",
      type: "number",
      row: "id",
      hint: "Only results with an ID greater than this.",
    },
    { key: "beforeId", label: "Before result ID", type: "number", row: "id" },
    {
      key: "afterDate",
      label: "After date",
      type: "string",
      row: "date",
      hint: "ISO 8601 UTC, or `YYYY-MM-DD HH:MM:SS` in the account's local time.",
    },
    { key: "beforeDate", label: "Before date", type: "string", row: "date" },
    {
      key: "sortId",
      label: "Sort by",
      type: "string",
      row: "sort",
      advanced: true,
      hint: "A meta field or item ID. Defaults to the result ID.",
    },
    {
      key: "sortDirection",
      label: "Order",
      type: "select",
      default: "desc",
      row: "sort",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    {
      key: "resultsView",
      label: "Results View ID",
      type: "string",
      advanced: true,
      hint: "Apply a saved Results View (columns and filters). Default: all data.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      row: "page",
      validation: { min: 1, max: 500, integer: true },
      hint: "Formsite returns at most 500 results per request.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      row: "page",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "page", type: "number", label: "Current page" },
    { key: "lastPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const { body, pagination } = await new FormsiteClient(ctx).requestPage<
      { results?: unknown[] }
    >(`/forms/${encodeURIComponent(input.formDir)}/results`, {
      query: {
        limit: input.limit,
        page: input.page,
        after_date: unset(input.afterDate),
        before_date: unset(input.beforeDate),
        after_id: input.afterId,
        before_id: input.beforeId,
        sort_id: unset(input.sortId),
        sort_direction: unset(input.sortDirection),
        results_view: unset(input.resultsView),
      },
    });
    return {
      results: body.results ?? [],
      page: pagination.page,
      lastPage: pagination.lastPage,
    };
  },
};

export default resultList;
