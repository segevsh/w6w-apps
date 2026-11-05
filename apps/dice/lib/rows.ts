import type { ActionDefinition, Param } from "@w6w/types";
import { isObject, objectInput, query, requiredString } from "./client.ts";

export interface RowsResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  totalCount: number | null;
  page: { hasMore: boolean; nextCursor: string | null };
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export function rowsResult(value: unknown): RowsResult {
  if (!isObject(value) || !Array.isArray(value.edges) || !isObject(value.pageInfo)) {
    throw new Error("DICE returned no valid connection; check resource access.");
  }
  const { hasNextPage, endCursor } = value.pageInfo;
  if (
    typeof hasNextPage !== "boolean" || (endCursor !== null && typeof endCursor !== "string") ||
    (hasNextPage && !endCursor)
  ) throw new Error("DICE returned invalid pagination information.");
  const rows = value.edges.map((edge) => {
    if (!isObject(edge) || !isObject(edge.node)) {
      throw new Error("DICE returned a missing row; refusing an incomplete page.");
    }
    return edge.node;
  });
  if (
    value.totalCount != null &&
    (typeof value.totalCount !== "number" || !Number.isInteger(value.totalCount) ||
      value.totalCount < 0)
  ) {
    throw new Error("DICE returned an invalid totalCount.");
  }
  return {
    rows,
    rowCount: rows.length,
    totalCount: value.totalCount as number | null ?? null,
    page: { hasMore: hasNextPage, nextCursor: hasNextPage ? endCursor as string : null },
    pageInfo: { hasNextPage, endCursor: endCursor as string | null },
  };
}

export interface ListSpec {
  key: string;
  title: string;
  resource: string;
  whereType: string;
  fields: string;
  filters?: Array<{ key: string; field: string; operator: string; param: Param }>;
}

/** The constants in each action are schema-verified; every caller value is a GraphQL variable. */
export function listAction(spec: ListSpec): ActionDefinition<Record<string, unknown>, RowsResult> {
  return {
    key: spec.key,
    title: spec.title,
    resource: spec.resource,
    type: "search",
    description:
      "Fetch one page of DICE partner records. Pass page.nextCursor as After to continue.",
    params: [
      ...(spec.filters ?? []).map((f) => f.param),
      {
        key: "first",
        label: "Page size",
        type: "number",
        default: 50,
        validation: { min: 1, max: 500, integer: true },
        hint: "1–500 rows per request (this app's limit).",
      },
      {
        key: "after",
        label: "After",
        type: "string",
        hint: "Opaque page.nextCursor from the previous result.",
      },
      {
        key: "where",
        label: "Additional filters",
        type: "json",
        advanced: true,
        hint: `DICE ${spec.whereType} object. Cannot duplicate a filter set above.`,
      },
    ],
    output: [
      { key: "rows", type: "array", label: "Rows" },
      { key: "rowCount", type: "number", label: "Rows in this page" },
      { key: "totalCount", type: "number", label: "Total matching rows (when supplied)" },
      { key: "pageInfo", type: "object", label: "DICE pagination" },
      { key: "page.hasMore", type: "boolean", label: "More pages" },
      { key: "page.nextCursor", type: "string", label: "Next cursor" },
    ],
    async execute(input, ctx) {
      const first = input.first ?? 50;
      if (typeof first !== "number" || !Number.isInteger(first) || first < 1 || first > 500) {
        throw new Error("first must be an integer from 1 to 500.");
      }
      const where = { ...objectInput(input.where, "where") };
      for (const filter of spec.filters ?? []) {
        const value = input[filter.key];
        if (value === undefined || value === "") continue;
        requiredString(value, filter.key);
        if (Object.hasOwn(where, filter.field)) {
          throw new Error(`where.${filter.field} duplicates ${filter.key}.`);
        }
        where[filter.field] = { [filter.operator]: value };
      }
      const variables: Record<string, unknown> = { first };
      if (input.after !== undefined && input.after !== "") {
        variables.after = requiredString(input.after, "after");
      }
      if (Object.keys(where).length) variables.where = where;
      const data = await query(
        ctx,
        `query W6WRows($first: Int, $after: String, $where: ${spec.whereType}) {
        viewer { ${spec.resource}(first: $first, after: $after, where: $where) {
          totalCount pageInfo { endCursor hasNextPage } edges { node { ${spec.fields} } }
        } }
      }`,
        variables,
      );
      return rowsResult(isObject(data.viewer) ? data.viewer[spec.resource] : undefined);
    },
  };
}

export const eventFilter = {
  key: "eventId",
  field: "eventId",
  operator: "eq",
  param: {
    key: "eventId",
    label: "Event ID",
    type: "string",
    hint: "DICE GraphQL event ID (not the public event URL).",
  } as Param,
};

export function dateFilter(key: string, field: string, label: string) {
  return { key, field, operator: "gte", param: { key, label, type: "datetime" } as Param };
}
