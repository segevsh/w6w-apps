import type { ActionDefinition } from "@w6w/types";
import { parseJsonOptional, QuickbaseClient, type QuickbaseRecordSet } from "../lib/client.ts";

interface SortRule {
  fieldId: number;
  order?: "ASC" | "DESC";
}

interface GroupRule {
  fieldId: number;
  grouping?: string;
}

interface Input {
  tableId: string;
  select?: unknown;
  where?: string;
  recordIds?: unknown;
  sortBy?: unknown;
  groupBy?: unknown;
  skip?: number;
  top?: number;
  compareWithAppLocalTime?: boolean;
}

/**
 * `POST /records/query`.
 *
 * ## Two things that surprise people about the response
 *
 * **Records are keyed by field ID, not by field label.** A row comes back as
 * `{"6": {"value": "Acme"}, "7": {"value": 10}}`. The `fields` array in the
 * same response is what maps `6` to `"Full Name"`, which is why this action
 * returns it rather than just the data.
 *
 * **`numRecords < totalRecords` is normal and does not mean the end.**
 * Quickbase calls this "intelligent pagination": it decides how much to return
 * based on payload size and processing time, so a response can be short even
 * when you asked for more. To walk the whole set, advance `skip` by the
 * `numRecords` you actually got and repeat until you have `totalRecords`.
 * Trusting `top` to be honoured is the classic way to silently drop rows.
 *
 * ## `where` — query language, or plain record IDs
 *
 * The spec declares `where` as a union: the Quickbase query language string, or
 * a JSON array of record IDs. Both are exposed — `where` for the former and
 * `recordIds` for the latter — because building `{3.EX.'12'}OR{3.EX.'13'}` by
 * hand to fetch three known records is needless. Omitting both returns every
 * record, which is what the API does.
 *
 * Query-language operators MUST be uppercase (`{6.CT.'acme'}`, not `.ct.`);
 * Quickbase does not error on a lowercase operator, it just stops matching.
 */
const queryRecords: ActionDefinition<Input, QuickbaseRecordSet> = {
  key: "query-records",
  type: "search",
  resource: "record",
  title: "Query Records",
  description:
    "Query records from a table with the Quickbase query language. Returns one page — advance `skip` by the returned `numRecords` to page through.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "select",
      label: "Field IDs to return",
      type: "json",
      hint: "Array of field IDs, e.g. [6, 7, 8]. Empty returns the table's default columns.",
    },
    {
      key: "where",
      label: "Where (Quickbase query language)",
      type: "string",
      placeholder: "{6.CT.'acme'}AND{7.GT.10}",
      hint:
        "Operators must be UPPERCASE — CT, XCT, EX, XEX, SW, GT, GTE, LT, LTE, BF, AF, IR. Empty returns all records.",
    },
    {
      key: "recordIds",
      label: "Record IDs",
      type: "json",
      hint:
        "Array of record IDs to fetch instead of a Where clause, e.g. [12, 13]. Ignored when Where is set.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "json",
      hint:
        "Array of { fieldId, order: 'ASC' | 'DESC' }. Omit to leave unsorted, which Quickbase says is faster.",
    },
    {
      key: "groupBy",
      label: "Group by",
      type: "json",
      hint: "Array of { fieldId, grouping: 'equal-values' }.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      hint: "Records to skip — the pagination cursor.",
    },
    {
      key: "top",
      label: "Top",
      type: "number",
      hint: "Maximum records to return. Quickbase may return fewer regardless.",
    },
    {
      key: "compareWithAppLocalTime",
      label: "Compare dates in the app's local time",
      type: "boolean",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Records (keyed by field ID)" },
    { key: "fields", type: "array", label: "Field ID → label map" },
    { key: "metadata", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    const client = new QuickbaseClient(ctx);

    // `where` wins when both are supplied: a query-language filter is the more
    // specific instruction, and silently ORing the two would be a third
    // behaviour nobody asked for.
    const where = input.where?.trim()
      ? input.where.trim()
      : parseJsonOptional<number[]>(input.recordIds, "Record IDs");

    const options = {
      skip: input.skip,
      top: input.top,
      compareWithAppLocalTime: input.compareWithAppLocalTime,
    };
    const hasOptions = Object.values(options).some((v) => v !== undefined);

    return client.request<QuickbaseRecordSet>("records/query", {
      method: "POST",
      body: {
        from: input.tableId,
        select: parseJsonOptional<number[]>(input.select, "Field IDs to return"),
        where,
        sortBy: parseJsonOptional<SortRule[]>(input.sortBy, "Sort by"),
        groupBy: parseJsonOptional<GroupRule[]>(input.groupBy, "Group by"),
        ...(hasOptions ? { options } : {}),
      },
    });
  },
};

export default queryRecords;
