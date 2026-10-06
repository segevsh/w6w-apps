import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  csv,
  LIMIT_PARAM,
  MODULE_PARAM,
  NinoxClient,
  OFFSET_PARAM,
  TABLE_PARAM,
} from "../lib/client.ts";

/**
 * `GET .../tables/{tableName}/records`. Uses the current `filter` query parameter; the vendor's
 * only deprecation is its Ninox 3 alias `filters`, which this action never sends. The vendor
 * documents `limit` 1-100 and the page info as `{has_more, limit, offset}`.
 */
interface Input {
  moduleName: string;
  tableName: string;
  fields?: string;
  filter?: Record<string, unknown> | string;
  sort?: string;
  limit?: number;
  offset?: number;
}

interface Output {
  records: Array<{ id: string; values: Record<string, unknown> }>;
  hasMore: boolean;
  offset?: number;
}

const recordList: ActionDefinition<Input, Output> = {
  key: "record-list",
  type: "read",
  resource: "record",
  title: "List Records",
  description: "List records of a table with optional field selection, a JSON equality filter " +
    "and sorting. Page with limit/offset while hasMore is true.",
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated field names to include. Empty returns every field.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint: 'JSON object of field values to match, e.g. {"email": "test@example.com"}.',
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "name,-_md",
      hint: 'Comma-separated field names; prefix with "-" for descending.',
    },
    LIMIT_PARAM,
    OFFSET_PARAM,
  ],
  output: [
    { key: "records", type: "array", label: "Records ({id, values})" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const filter = asOptionalJson<unknown>(input.filter, "filter");
    const { items, hasMore, offset } = await client.list<Output["records"][number]>(
      `${client.tablePath(input)}/records`,
      {
        fields: csv(input.fields),
        filter: filter === undefined ? undefined : JSON.stringify(filter),
        sort: input.sort?.trim() || undefined,
        limit: input.limit,
        offset: input.offset,
      },
    );
    return { records: items, hasMore, offset };
  },
};

export default recordList;
