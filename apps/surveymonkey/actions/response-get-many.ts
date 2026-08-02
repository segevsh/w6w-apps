import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  surveyId: string;
  page?: number;
  perPage?: number;
  simple?: boolean;
  collectorIds?: string;
  startCreatedAt?: string;
  endCreatedAt?: string;
  startModifiedAt?: string;
  endModifiedAt?: string;
  status?: string;
  email?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * GET /surveys/{id}/responses/bulk — the full, expanded responses to a survey
 * (every question's answers included), as opposed to the summary-only
 * `/responses` list. Supports date-window, collector and status filtering.
 */
const responseGetMany: ActionDefinition<Input> = {
  key: "response-get-many",
  type: "read",
  resource: "response",
  title: "Get Many Responses (Bulk)",
  description:
    "Retrieve the full, answer-expanded responses submitted to a survey, with paging and filtering.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number. Default 1.",
    },
    {
      key: "perPage",
      label: "Page size",
      type: "number",
      hint: "Responses per page. Default 50, maximum 100.",
      validation: { min: 1, max: 100 },
    },
    {
      key: "simple",
      label: "Include question/answer text",
      type: "boolean",
      hint: "When true, includes readable question and answer text in addition to ids.",
    },
    {
      key: "collectorIds",
      label: "Collector IDs",
      type: "string",
      hint: "Comma-separated collector ids to restrict to.",
    },
    { key: "startCreatedAt", label: "Started after", type: "string", hint: "ISO-8601 timestamp." },
    { key: "endCreatedAt", label: "Started before", type: "string", hint: "ISO-8601 timestamp." },
    {
      key: "startModifiedAt",
      label: "Modified after",
      type: "string",
      hint: "ISO-8601 timestamp.",
    },
    {
      key: "endModifiedAt",
      label: "Modified before",
      type: "string",
      hint: "ISO-8601 timestamp.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "completed", label: "Completed" },
        { value: "partial", label: "Partial" },
        { value: "overquota", label: "Over quota" },
        { value: "disqualified", label: "Disqualified" },
      ],
    },
    { key: "email", label: "Recipient email", type: "string" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [{ value: "date_modified", label: "Date modified" }],
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
    { key: "data", type: "array", label: "Responses" },
    { key: "total", type: "number", label: "Total items" },
    { key: "page", type: "number", label: "Current page" },
    { key: "per_page", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request(
      `/surveys/${encodeURIComponent(input.surveyId)}/responses/bulk`,
      {
        query: {
          page: input.page,
          per_page: input.perPage,
          simple: input.simple,
          collector_ids: input.collectorIds,
          start_created_at: input.startCreatedAt,
          end_created_at: input.endCreatedAt,
          start_modified_at: input.startModifiedAt,
          end_modified_at: input.endModifiedAt,
          status: input.status,
          email: input.email,
          sort_by: input.sortBy,
          sort_order: input.sortOrder,
        },
      },
    );
  },
};

export default responseGetMany;
