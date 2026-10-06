import type { ActionDefinition } from "@w6w/types";
import { compact, FireberryClient, jsonValue } from "../lib/client.ts";

interface Input {
  objectType: number;
  fields: Array<{ name: string; alias?: string; aggrFunc?: string }> | string[] | string;
  filter?: unknown;
  orderBy?: unknown;
  groupBy?: unknown;
  pageSize?: number;
  pageNumber?: number;
}

/** `POST /api/v3/query` — the v3 query endpoint (the legacy `/api/query` is not exposed). */
const queryRecords: ActionDefinition<Input> = {
  key: "query-records",
  type: "search",
  resource: "record",
  title: "Query Records",
  description:
    "Search, filter, sort, group and aggregate records of any object with Fireberry's v3 query. Pages of up to 500 rows; `isLastPage` says when to stop.",
  params: [
    {
      key: "objectType",
      label: "Object number",
      type: "number",
      required: true,
      hint: "Numeric object type code (account is 1).",
      validation: { min: 1, integer: true },
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint:
        'Fields to return: an array of names (["accountname","ownerid_fullname"]) or of {name, alias?, aggrFunc?} objects. A name with an underscore reaches a related record\'s field. aggrFunc (SUM, COUNT, MIN, MAX) needs groupBy.',
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'Array of condition groups, ANDed together: [{"type":"AND","conditions":[{"fieldName":"accountname","operator":"start-with","value":"Y"}]}]. Operators: eq, ne, lt, gt, le, ge, start-with, not-start-with, is-null, is-not-null, eq-in, not-in, between, userid.',
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "json",
      hint:
        'Array of {"name": "<field>", "order": "asc"|"desc"}. With groupBy, every field must also be grouped.',
    },
    {
      key: "groupBy",
      label: "Group by",
      type: "json",
      hint: 'Array of {"name": "<field>", "datePeriod"?: "DAY"|"WEEK"|"MONTH"|"QUARTER"|"YEAR"|…}.',
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "1-500. Fireberry's default is 25.",
      validation: { min: 1, max: 500, integer: true },
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Positive integer, default 1.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "records", type: "array", label: "Matching rows; each carries `_id`" },
    { key: "pageNumber", type: "number", label: "Page returned" },
    { key: "pageSize", type: "number", label: "Page size used" },
    { key: "isLastPage", type: "boolean", label: "True when there is no further page" },
  ],

  async execute(input, ctx) {
    const rawFields = jsonValue(input.fields);
    if (!Array.isArray(rawFields) || rawFields.length === 0) {
      throw new Error("fields must be a non-empty JSON array");
    }
    const fields = rawFields.map((f) => typeof f === "string" ? { name: f } : f);
    const body = await new FireberryClient(ctx).request<{
      data?: unknown[];
      pageNumber?: number;
      pageSize?: number;
      isLastPage?: boolean;
    }>("POST", "/api/v3/query", {
      body: compact({
        objectType: input.objectType,
        fields,
        filter: jsonValue(input.filter),
        orderBy: jsonValue(input.orderBy),
        groupBy: jsonValue(input.groupBy),
        pageSize: input.pageSize,
        pageNumber: input.pageNumber,
      }),
    });
    return {
      records: body.data ?? [],
      pageNumber: body.pageNumber,
      pageSize: body.pageSize,
      isLastPage: body.isLastPage,
    };
  },
};

export default queryRecords;
