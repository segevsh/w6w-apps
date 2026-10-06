import type { ActionDefinition, Param } from "@w6w/types";
import { EconomicClient, pageOf, seg } from "./client.ts";

interface ListInput {
  filter?: string;
  sort?: string;
  pageSize?: number;
  skipPages?: number;
}

export const FILTER_HINT =
  "e-conomic filter syntax, e.g. `name$like:acme` or `customerNumber$gte:100$and:barred$eq:false`. Operators: $eq $ne $gt $gte $lt $lte $like $in $nin; chain with $and: / $or:. Only properties the schema marks filterable work.";

/** Standard page controls shared by every list action. */
export const pageParams: Param[] = [
  { key: "filter", label: "Filter", type: "string", hint: FILTER_HINT },
  {
    key: "sort",
    label: "Sort",
    type: "string",
    hint:
      "Property name; prefix `-` for descending, comma-separate several. e.g. `-customerNumber`.",
  },
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    default: 100,
    hint: "1–1000 (default 100).",
  },
  {
    key: "skipPages",
    label: "Pages to skip",
    type: "number",
    default: 0,
    hint: "Zero-based page offset; use `nextSkipPages` from the previous result.",
  },
];

const listOutput = [
  { key: "items", type: "array", label: "Items" },
  { key: "count", type: "number", label: "Items in this page" },
  { key: "total", type: "number", label: "Total matching" },
  { key: "hasMore", type: "boolean", label: "More pages available" },
  { key: "nextSkipPages", type: "number", label: "Pages to skip for the next page" },
] as const;

export interface ListSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string;
}

/** A read action over a documented collection endpoint. */
export function listAction(spec: ListSpec): ActionDefinition<ListInput> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: pageParams,
    output: [...listOutput],
    async execute(input, ctx) {
      const size = Math.min(Math.max(Number(input.pageSize ?? 100) || 100, 1), 1000);
      const body = await new EconomicClient(ctx).request("GET", spec.path, {
        query: {
          filter: input.filter,
          sort: input.sort,
          pagesize: size,
          skippages: input.skipPages ? Number(input.skipPages) : undefined,
        },
      });
      return pageOf(body);
    },
  };
}

export interface GetSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  /** Path before the id, e.g. `/customers`. */
  path: string;
  idKey: string;
  idLabel: string;
  idType?: "string" | "number";
  /** Name of the wrapping output key. */
  outputKey: string;
}

/** A read action fetching one object by its id. */
export function getAction(spec: GetSpec): ActionDefinition<Record<string, string | number>> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [{
      key: spec.idKey,
      label: spec.idLabel,
      type: spec.idType ?? "number",
      required: true,
    }],
    output: [{ key: spec.outputKey, type: "object", label: spec.title }],
    async execute(input, ctx) {
      const item = await new EconomicClient(ctx).request(
        "GET",
        `${spec.path}/${seg(input[spec.idKey])}`,
      );
      return { [spec.outputKey]: item };
    },
  };
}
