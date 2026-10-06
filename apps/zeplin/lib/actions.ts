import type { ActionDefinition, Param } from "@w6w/types";
import { pathId, type Query, ZeplinClient } from "./client.ts";

/** Loose input bag: every action validates what it needs through `pathId`/`requireText`. */
export type Input = Record<string, unknown>;

const idParam = (key: string, label: string, hint?: string): Param => ({
  key,
  label,
  type: "string",
  required: true,
  ...(hint ? { hint } : {}),
});

export const projectIdParam = idParam("projectId", "Project ID", "24-character Zeplin project id.");
export const screenIdParam = idParam("screenId", "Screen ID");
export const noteIdParam = idParam("noteId", "Note ID");
export const styleguideIdParam = idParam(
  "styleguideId",
  "Styleguide ID",
  "24-character Zeplin styleguide id.",
);
export const organizationIdParam = idParam("organizationId", "Organization ID");

export const pagingParams: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 30,
    validation: { integer: true, min: 1, max: 100 },
    hint: "Page size, 1-100 (vendor default 30).",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    default: 0,
    validation: { integer: true, min: 0 },
    hint: "Items to skip. Use `next_offset` from the previous result for the next page.",
  },
];

export const PAGE_OUTPUT = [
  { key: "items", type: "array", label: "Items on this page" },
  { key: "count", type: "number", label: "Number of items on this page" },
  { key: "limit", type: "number", label: "Limit used" },
  { key: "offset", type: "number", label: "Offset used" },
  { key: "next_offset", type: "number", label: "Offset of the next page (null on the last page)" },
] as const;

export const flagParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "boolean",
  default: false,
  hint,
});

function intOrUndefined(v: unknown, label: string, min: number, max: number): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return n;
}

export function paging(input: Input): { limit?: number; offset?: number } {
  return {
    limit: intOrUndefined(input.limit, "Limit", 1, 100),
    offset: intOrUndefined(input.offset, "Offset", 0, Number.MAX_SAFE_INTEGER),
  };
}

interface ListSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  params: Param[];
  /** Path under `/v1`, built from the (validated) input. */
  path: (input: Input) => string;
  query?: (input: Input) => Query;
  /** Endpoint has no `limit`/`offset` (returns everything). */
  unpaged?: boolean;
}

/** A `GET` list endpoint: bare JSON array in, `{ items, count, limit, offset, next_offset }` out. */
export function listAction(spec: ListSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: spec.unpaged ? spec.params : [...spec.params, ...pagingParams],
    output: spec.unpaged ? [{ key: "items", type: "array", label: "Items" }] : [...PAGE_OUTPUT],
    async execute(input, ctx) {
      const client = new ZeplinClient(ctx);
      const path = spec.path(input);
      const query = spec.query?.(input) ?? {};
      if (spec.unpaged) {
        const items = await client.get<unknown>(path, query);
        if (!Array.isArray(items)) throw new Error(`Zeplin GET ${path}: expected a JSON array`);
        return { items };
      }
      return await client.page(path, query, paging(input));
    },
  };
}

interface GetSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  params: Param[];
  path: (input: Input) => string;
  query?: (input: Input) => Query;
  output: ActionDefinition["output"];
}

/** A `GET` single-object endpoint; the vendor's object is returned as-is. */
export function getAction(spec: GetSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    async execute(input, ctx) {
      return await new ZeplinClient(ctx).get<Record<string, unknown>>(
        spec.path(input),
        spec.query?.(input),
      );
    },
  };
}

export const projectPath = (input: Input) => `/projects/${pathId(input.projectId, "Project ID")}`;
export const screenPath = (input: Input) =>
  `${projectPath(input)}/screens/${pathId(input.screenId, "Screen ID")}`;
export const styleguidePath = (input: Input) =>
  `/styleguides/${pathId(input.styleguideId, "Styleguide ID")}`;
export const organizationPath = (input: Input) =>
  `/organizations/${pathId(input.organizationId, "Organization ID")}`;

/** `linked_project`/`linked_styleguide`/`include_linked_styleguides` shared by styleguide reads. */
export const linkedParams: Param[] = [
  {
    key: "linkedProject",
    label: "Linked project ID",
    type: "string",
    hint:
      "Read the styleguide as seen from this linked project (see the vendor's Styleguide docs).",
  },
  {
    key: "linkedStyleguide",
    label: "Linked styleguide ID",
    type: "string",
    hint: "Read the styleguide as seen from this linked styleguide.",
  },
];

export function linkedQuery(input: Input): Query {
  return {
    linked_project: String(input.linkedProject ?? "").trim() || undefined,
    linked_styleguide: String(input.linkedStyleguide ?? "").trim() || undefined,
  };
}

export const includeLinkedParam = flagParam(
  "includeLinkedStyleguides",
  "Include linked styleguides",
  "Also return items from the styleguides linked to this one.",
);

export const includeLinkedQuery = (input: Input): Query => ({
  include_linked_styleguides: input.includeLinkedStyleguides ? true : undefined,
});
