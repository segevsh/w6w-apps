import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, encodeId, pageOf } from "../lib/client.ts";
import { formatParam } from "../lib/params.ts";

interface Input {
  parserId: string;
  format?: string;
  list?: string;
  limit?: number;
  date?: string;
  remoteId?: string;
  includeProcessingQueue?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

const resultsList: ActionDefinition<Input> = {
  key: "results-list",
  type: "search",
  resource: "result",
  title: "Get Parsed Data of Multiple Documents",
  description:
    "Fetch parsed data for a parser's documents: the last N uploaded (default 100, max 10,000), " +
    "or those uploaded/processed after a date. Not paginated; narrow with the filters. " +
    "Rate limit: 30 calls per minute.",
  params: [
    { key: "parserId", label: "Parser ID", type: "string", required: true },
    formatParam,
    {
      key: "list",
      label: "Which documents",
      type: "select",
      options: [
        { value: "last_uploaded", label: "Last uploaded (default)" },
        { value: "uploaded_after", label: "Uploaded after a date" },
        { value: "processed_after", label: "Processed after a date" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Applies to 'Last uploaded'. Docparser's default is 100, its maximum 10,000.",
      validation: { min: 1, max: 10000, integer: true },
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      hint:
        "Required for the 'after' modes. ISO 8601 (2017-02-12T15:19:21+00:00) or a unix timestamp.",
    },
    {
      key: "remoteId",
      label: "Remote ID",
      type: "string",
      hint: "Only documents imported with this remote ID.",
    },
    {
      key: "includeProcessingQueue",
      label: "Include documents still processing",
      type: "boolean",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        "uploaded_at",
        "parsed_at",
        "processed_at",
        "first_processed_at",
        "imported_at",
        "integrated_at",
        "dispatched_webhook_at",
        "preprocessed_at",
      ].map((v) => ({ value: v, label: v })),
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "DESC", label: "Descending (default)" }, {
        value: "ASC",
        label: "Ascending",
      }],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Parsed documents" },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(input, ctx) {
    const p = encodeId(input.parserId, "parserId");
    if (input.list && input.list !== "last_uploaded" && !input.date?.trim()) {
      throw new Error(`date is required when list is ${input.list}`);
    }
    const rows = await new DocparserClient(ctx).json<unknown[]>(`/v1/results/${p}`, {
      query: {
        format: input.format,
        list: input.list,
        limit: input.limit,
        date: input.date?.trim(),
        remote_id: input.remoteId,
        include_processing_queue: input.includeProcessingQueue ? "true" : undefined,
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
      },
    });
    return pageOf(rows);
  },
};

export default resultsList;
