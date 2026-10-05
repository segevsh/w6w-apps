import type { ActionDefinition } from "@w6w/types";
import { NetSuiteClient, recordPath } from "../lib/client.ts";
import { pageOutput, recordTypeParam } from "../lib/params.ts";

interface Input {
  recordType: string;
  q?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /services/rest/record/v1/<type>?q=…&limit=…&offset=…` — "Listing All Record Instances",
 * "Record Collection Filtering" and "Collection Paging". The collection returns **ids and links
 * only**; fetch each with Get Record, or use Run SuiteQL Query to read columns.
 */
const recordList: ActionDefinition<Input> = {
  key: "record-list",
  type: "search",
  resource: "record",
  title: "List Records",
  description: "List the ids of records of one type, optionally filtered, one page at a time.",
  params: [
    recordTypeParam,
    {
      key: "q",
      label: "Filter",
      type: "string",
      placeholder: 'email START_WITH "barbara" AND isinactive IS false',
      hint: "A NetSuite filter: `field OPERATOR value`, joined with AND / OR and grouped with " +
        "parentheses. Quote values containing spaces. Operators include IS, IS_NOT, CONTAIN, " +
        "START_WITH, ANY_OF, BETWEEN, GREATER, LESS, EMPTY, ON_OR_AFTER, BEFORE. Only body " +
        "fields can be filtered; joins and sublists are not supported.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 1000,
      validation: { min: 1, max: 1000, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { min: 0, integer: true },
      hint: "Must be a multiple of the page size (NetSuite rejects other offsets).",
    },
  ],
  output: pageOutput,

  async execute(input, ctx) {
    const limit = input.limit ?? 1000;
    const offset = input.offset ?? 0;
    if (offset % limit !== 0) {
      throw new Error("`offset` must be a multiple of `limit` — NetSuite pages in whole pages.");
    }
    const client = new NetSuiteClient(ctx);
    const res = await client.request(recordPath(input.recordType), {
      query: { q: input.q?.trim() || undefined, limit, offset },
    });
    const d = res.data ?? {};
    return {
      items: d.items ?? [],
      count: d.count ?? 0,
      offset: d.offset ?? offset,
      hasMore: d.hasMore ?? false,
      totalResults: d.totalResults ?? null,
    };
  },
};

export default recordList;
