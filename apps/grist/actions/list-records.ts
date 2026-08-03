import type { ActionDefinition } from "@w6w/types";
import { encodeFilter, GristClient, type GristRecordsList } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  filter?: unknown;
  sort?: string;
  limit?: number;
  hidden?: boolean;
  cellFormat?: "normal" | "typed";
}

/**
 * `GET /docs/{docId}/tables/{tableId}/records`.
 *
 * Returns `{ records: [{ id, fields }] }` — a **whole** result, not a page.
 * Grist emits no cursor and no total, so `limit` truncates rather than
 * paginates. See README § "There is no cursor" for how to walk a big table.
 */
const listRecords: ActionDefinition<Input, GristRecordsList> = {
  key: "list-records",
  type: "search",
  resource: "record",
  title: "List Records",
  description:
    "Fetch records from a table, optionally filtered by exact column values and sorted. Returns all matches unless `limit` is set.",
  params: [
    {
      key: "docId",
      label: "Document ID",
      type: "string",
      required: true,
      placeholder: "9PJhBDZPyCNoayZxaCwFfS",
      hint: "From the doc URL, or from `list-workspaces`.",
    },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The normalized TABLE ID shown in Raw Data — not the display name.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'JSON object mapping column ID to an ARRAY of allowed values, e.g. {"pet": ["cat","dog"]}. ' +
        "Exact matches only — there is no operator syntax. Use `run-sql` for ranges or LIKE.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "pet,-age",
      hint:
        "Comma-separated column IDs; prefix `-` for descending. `manualSort` reproduces the order " +
        "set by hand in the UI. Options append after a colon: `-age:naturalSort;emptyLast`.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Return at most this many rows. 0 means no limit. Empty means no limit.",
    },
    {
      key: "hidden",
      label: "Include hidden columns",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Adds Grist's internal columns such as `manualSort`.",
    },
    {
      key: "cellFormat",
      label: "Cell format",
      type: "select",
      default: "normal",
      advanced: true,
      options: [
        { value: "normal", label: "normal — compact values, meaning depends on column type" },
        { value: "typed", label: 'typed — self-describing, e.g. ["d", timestamp] for a Date' },
      ],
      hint: '`typed` also returns formula errors inline as ["E", …] instead of null.',
    },
  ],
  output: [
    { key: "records", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<GristRecordsList>(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/records`,
      {
        query: {
          filter: encodeFilter(input.filter),
          sort: input.sort,
          limit: input.limit,
          hidden: input.hidden,
          cellFormat: input.cellFormat,
        },
      },
    );
  },
};

export default listRecords;
