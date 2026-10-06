import type { ActionDefinition, Param } from "@w6w/types";
import { compact, encodeId, LoyverseClient, toList } from "./client.ts";

/** `limit` + `cursor`, on the endpoints the spec documents them for. */
export const paginationParams: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    validation: { min: 1, max: 250, integer: true },
    hint: "Page size, 1-250. Loyverse's default is 50.",
  },
  {
    key: "cursor",
    label: "Cursor",
    type: "string",
    hint: "The `cursor` from the previous page. Absent from a response on the last page.",
  },
];

export const showDeletedParam: Param = {
  key: "showDeleted",
  label: "Include deleted",
  type: "boolean",
  hint: "Soft-deleted records are hidden by default.",
};

export const dateRangeParams: Param[] = [
  {
    key: "createdAtMin",
    label: "Created after",
    type: "string",
    hint: "ISO 8601 UTC, e.g. 2026-01-31T18:30:00.000Z.",
  },
  { key: "createdAtMax", label: "Created before", type: "string", hint: "ISO 8601 UTC." },
];

export const updatedRangeParams: Param[] = [
  { key: "updatedAtMin", label: "Updated after", type: "string", hint: "ISO 8601 UTC." },
  { key: "updatedAtMax", label: "Updated before", type: "string", hint: "ISO 8601 UTC." },
];

export function idsParam(key: string, label: string): Param {
  return {
    key,
    label,
    type: "string",
    hint: "Comma-separated ids; returns only those records.",
  };
}

type Input = Record<string, unknown>;

interface ListSpec {
  key: string;
  title: string;
  description: string;
  resource: string;
  path: string;
  /** The response key holding the array, equal to the resource's plural name. */
  listKey: string;
  /** action param key -> wire query key, for comma-list params. */
  listQuery?: Record<string, string>;
  /** action param key -> wire query key, passed through unchanged. */
  query?: Record<string, string>;
  params: Param[];
  paginated: boolean;
}

/** A GET list action. Query names come from the OpenAPI document per endpoint. */
export function listAction(spec: ListSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "search",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: [
      { key: spec.listKey, type: "array", label: spec.title },
      ...(spec.paginated
        ? [{
          key: "cursor",
          type: "string" as const,
          label: "Cursor for the next page (absent on the last page)",
        }]
        : []),
    ],
    execute(input, ctx) {
      const query: Record<string, unknown> = {};
      for (const [from, to] of Object.entries(spec.listQuery ?? {})) {
        query[to] = toList(input[from] as string | undefined)?.join(",");
      }
      for (const [from, to] of Object.entries(spec.query ?? {})) {
        const v = input[from];
        query[to] = typeof v === "boolean" ? (v ? "true" : undefined) : v;
      }
      return new LoyverseClient(ctx).json(spec.path, {
        query: compact(query) as Record<string, string>,
      });
    },
  };
}

interface GetSpec {
  key: string;
  title: string;
  description: string;
  resource: string;
  /** Path with a `{id}` placeholder. */
  path: string;
  idKey: string;
  idLabel: string;
  /** Response key naming the record; defaults to `id`. */
  outputKey?: string;
}

export function getAction(spec: GetSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [{ key: spec.idKey, label: spec.idLabel, type: "string", required: true }],
    output: [{ key: spec.outputKey ?? "id", type: "string", label: "Id" }],
    async execute(input, ctx) {
      const id = String(input[spec.idKey] ?? "").trim();
      if (!id) throw new Error(`${spec.idLabel} is required`);
      return await new LoyverseClient(ctx).json(spec.path.replace("{id}", encodeId(id)));
    },
  };
}
