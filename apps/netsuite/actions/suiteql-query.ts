import type { ActionDefinition } from "@w6w/types";
import { NetSuiteClient, parseJson, REST } from "../lib/client.ts";
import { pageOutput } from "../lib/params.ts";

interface Input {
  query: string;
  params?: unknown;
  limit?: number;
  offset?: number;
  fetchAll?: boolean;
  maxRows?: number;
}

/**
 * `POST /services/rest/query/v1/suiteql?limit=&offset=` with `Prefer: transient` (required) and
 * `{"q": "...", "params": [...]}` — "Executing SuiteQL Queries Through REST Web Services".
 *
 * The response is `{items, count, offset, hasMore, totalResults}`; column values come back as
 * the vendor serialises them (Oracle's own example shows an aggregate as the string `"143"`).
 * Paging follows "Collection Paging": at most 1000 rows per page and `offset` a multiple of
 * `limit`. `fetchAll` walks `hasMore` page by page, bounded by `maxRows`.
 */
const suiteqlQuery: ActionDefinition<Input> = {
  key: "suiteql-query",
  type: "search",
  resource: "query",
  title: "Run SuiteQL Query",
  description: "Run a SuiteQL (SQL) query over NetSuite records, one page or all pages.",
  params: [
    {
      key: "query",
      label: "SuiteQL",
      type: "code",
      required: true,
      placeholder: "SELECT id, email FROM customer WHERE isinactive = 'F'",
      hint: "A SELECT in SuiteQL. Use `?` placeholders with Bound parameters instead of pasting " +
        "user input into the text. Table and column names are in NetSuite's Records Catalog.",
    },
    {
      key: "params",
      label: "Bound parameters",
      type: "json",
      hint: 'A JSON array filling the `?` placeholders in order, e.g. `["-7","0"]`.',
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
      hint: "Must be a multiple of the page size.",
    },
    {
      key: "fetchAll",
      label: "Fetch all pages",
      type: "boolean",
      default: false,
      hint: "Keep requesting pages until `hasMore` is false or Max rows is reached.",
    },
    {
      key: "maxRows",
      label: "Max rows (fetch all)",
      type: "number",
      default: 10000,
      validation: { min: 1, max: 100000, integer: true },
      hint: "Safety cap for Fetch all pages. NetSuite itself serves at most 100,000 rows without " +
        "SuiteAnalytics Connect.",
    },
  ],
  output: [...pageOutput, { key: "pages", type: "number", label: "Pages requested" }],

  async execute(input, ctx) {
    const limit = input.limit ?? 1000;
    const start = input.offset ?? 0;
    if (!input.query || input.query.trim() === "") throw new Error("`query` is required.");
    if (start % limit !== 0) {
      throw new Error("`offset` must be a multiple of `limit` — NetSuite pages in whole pages.");
    }
    const bound = parseJson(input.params, "params");
    if (bound !== undefined && !Array.isArray(bound)) {
      throw new Error("`params` must be a JSON array.");
    }
    const maxRows = input.maxRows ?? 10000;
    const client = new NetSuiteClient(ctx);

    const items: unknown[] = [];
    let offset = start;
    let pages = 0;
    let hasMore = false;
    let total: unknown = null;
    do {
      const res = await client.request(`${REST}/query/v1/suiteql`, {
        method: "POST",
        query: { limit, offset },
        headers: { prefer: "transient" },
        body: bound === undefined ? { q: input.query } : { q: input.query, params: bound },
      });
      const d = res.data ?? {};
      const page = Array.isArray(d.items) ? d.items : [];
      items.push(...page);
      total = d.totalResults ?? total;
      hasMore = d.hasMore === true;
      pages++;
      offset += limit;
    } while (input.fetchAll && hasMore && items.length < maxRows);

    const capped = items.length > maxRows ? items.slice(0, maxRows) : items;
    return {
      items: capped,
      count: capped.length,
      offset: start,
      hasMore: hasMore || capped.length < items.length,
      totalResults: total,
      pages,
    };
  },
};

export default suiteqlQuery;
