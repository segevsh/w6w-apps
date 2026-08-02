import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  surveyId: string;
  name?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: string;
  include?: string;
}

/** GET /surveys/{id}/collectors — list the collectors (distribution channels) for a survey. */
const collectorGetMany: ActionDefinition<Input> = {
  key: "collector-get-many",
  type: "read",
  resource: "collector",
  title: "Get Many Collectors",
  description: "List the collectors set up to distribute a survey.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true },
    { key: "name", label: "Name filter", type: "string" },
    { key: "page", label: "Page", type: "number" },
    { key: "perPage", label: "Page size", type: "number" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "date_modified", label: "Date modified" },
        { value: "type", label: "Type" },
        { value: "status", label: "Status" },
        { value: "name", label: "Name" },
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
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: 'Comma-separated extra fields, e.g. "response_count,url".',
    },
  ],
  output: [
    { key: "data", type: "array", label: "Collectors" },
    { key: "total", type: "number", label: "Total items" },
    { key: "page", type: "number", label: "Current page" },
    { key: "per_page", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request(
      `/surveys/${encodeURIComponent(input.surveyId)}/collectors`,
      {
        query: {
          name: input.name,
          page: input.page,
          per_page: input.perPage,
          sort_by: input.sortBy,
          sort_order: input.sortOrder,
          include: input.include,
        },
      },
    );
  },
};

export default collectorGetMany;
