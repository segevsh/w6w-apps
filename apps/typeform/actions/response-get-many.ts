import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

interface Input {
  formId: string;
  pageSize?: number;
  since?: string;
  until?: string;
  after?: string;
  before?: string;
  responseType?: string;
  query?: string;
  sort?: string;
}

/**
 * GET /forms/{form_id}/responses — retrieve the submissions collected by a form.
 * Supports date-window and cursor paging plus a free-text `query` over answers
 * and hidden fields.
 */
const responseGetMany: ActionDefinition<Input> = {
  key: "response-get-many",
  type: "read",
  resource: "response",
  title: "Get Many Responses",
  description: "Retrieve the responses submitted to a form, with paging and filtering.",
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Responses per page. Default 25, maximum 1000.",
      validation: { min: 1, max: 1000 },
    },
    {
      key: "since",
      label: "Since",
      type: "string",
      hint: "ISO-8601 or Unix timestamp — responses submitted after.",
    },
    {
      key: "until",
      label: "Until",
      type: "string",
      hint: "ISO-8601 or Unix timestamp — responses submitted before.",
    },
    {
      key: "after",
      label: "After token",
      type: "string",
      hint: "Cursor: responses after this token (exclusive).",
    },
    {
      key: "before",
      label: "Before token",
      type: "string",
      hint: "Cursor: responses before this token (exclusive).",
    },
    {
      key: "responseType",
      label: "Response type",
      type: "select",
      options: [
        { value: "completed", label: "Completed" },
        { value: "partial", label: "Partial" },
      ],
    },
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Match answers or hidden fields containing this phrase.",
    },
    { key: "sort", label: "Sort", type: "string", hint: 'e.g. "submitted_at,desc".' },
  ],
  output: [
    { key: "items", type: "array", label: "Responses" },
    { key: "total_items", type: "number", label: "Total items" },
    { key: "page_count", type: "number", label: "Page count" },
  ],

  execute(input, ctx) {
    return new TypeformClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/responses`,
      {
        query: {
          page_size: input.pageSize,
          since: input.since,
          until: input.until,
          after: input.after,
          before: input.before,
          response_type: input.responseType,
          query: input.query,
          sort: input.sort,
        },
      },
    );
  },
};

export default responseGetMany;
