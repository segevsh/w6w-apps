import type { ActionDefinition, Param } from "@w6w/types";
import { compact, pageOf, RecruitClient } from "./client.ts";
import type { QueryValue } from "./client.ts";

export const slugParam = (key: string, label: string, what: string): Param => ({
  key,
  label,
  type: "string",
  required: true,
  hint: `Numeric ${what} id (Recruit CRM calls it the slug), e.g. 1205129.`,
});

export const paginationParams: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 25,
    validation: { integer: true, min: 1, max: 100 },
    hint: "Records per page (vendor maximum 100).",
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "Page number; follow `hasMore` to walk the list.",
  },
];

export const pageOutput = [
  { key: "items", type: "array", label: "Records on this page" },
  { key: "count", type: "number", label: "Records returned" },
  { key: "currentPage", type: "number", label: "Current page" },
  { key: "perPage", type: "number", label: "Records per page" },
  { key: "hasMore", type: "boolean", label: "Another page exists" },
] as const;

export interface ListInput {
  limit?: number;
  page?: number;
}

export function listQuery(input: ListInput): Record<string, QueryValue> {
  return { limit: input.limit, page: input.page };
}

/** A field a form collects and the vendor's own name for it in the request body. */
export interface Field {
  key: string;
  api: string;
  label: string;
  type: "string" | "text" | "number" | "boolean" | "date";
  hint?: string;
}

export function fieldParams(fields: Field[]): Param[] {
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    ...(f.hint ? { hint: f.hint } : {}),
  }));
}

/** Map form input onto the vendor's snake_case body keys, dropping anything unset. */
export function fieldBody(
  fields: Field[],
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.api] = input[f.key];
  return compact(out);
}

/** Build a paginated list action over `GET {path}`. */
export function listAction(spec: {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string;
}): ActionDefinition<ListInput> {
  return {
    key: spec.key,
    type: "search",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [...paginationParams],
    output: [...pageOutput],
    async execute(input, ctx) {
      const raw = await new RecruitClient(ctx).json(spec.path, { query: listQuery(input) });
      return pageOf(raw as never);
    },
  };
}

/** Build a search action over `GET {path}/search`; each filter is a documented query field. */
export function searchAction(spec: {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string;
  filters: Array<{ key: string; api: string; label: string; type?: "string" | "number" }>;
}): ActionDefinition<Record<string, unknown>> {
  return {
    key: spec.key,
    type: "search",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: spec.filters.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type ?? "string",
    })),
    output: [...pageOutput],
    async execute(input, ctx) {
      const query: Record<string, QueryValue> = {};
      for (const f of spec.filters) query[f.api] = input[f.key] as QueryValue;
      const raw = await new RecruitClient(ctx).json(`${spec.path}/search`, { query });
      return pageOf(raw as never);
    },
  };
}
