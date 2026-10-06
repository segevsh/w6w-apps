import type { ActionDefinition, Param } from "@w6w/types";
import { compact, ElasticClient, encodeId } from "./client.ts";

/** `limit` + `offset`, on the endpoints the spec documents them for. */
export const pagingParams: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    validation: { min: 1, integer: true },
    hint: "Maximum number of items returned. The vendor's default differs per endpoint " +
      "(contacts 20, templates 500).",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    validation: { min: 0, integer: true },
    hint: "How many items to skip. Page by adding the previous page's `count` to it.",
  },
];

type Input = Record<string, unknown>;

/** Wrap the vendor's bare array so an action returns an object. */
export function wrapList(items: unknown): { items: unknown[]; count: number } {
  const list = Array.isArray(items) ? items : [];
  return { items: list, count: list.length };
}

interface ListSpec {
  key: string;
  title: string;
  description: string;
  resource: string;
  path: string;
  /** action param key -> wire query key, passed through unchanged. */
  query?: Record<string, string>;
  params: Param[];
}

/** A GET list action. Every list endpoint answers a bare array; it is wrapped in `items`. */
export function listAction(spec: ListSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "search",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: [
      { key: "items", type: "array", label: spec.title },
      { key: "count", type: "number", label: "Items on this page" },
    ],
    async execute(input, ctx) {
      const query: Record<string, unknown> = {};
      for (
        const [from, to] of Object.entries({ limit: "limit", offset: "offset", ...spec.query })
      ) {
        query[to] = input[from];
      }
      const out = await new ElasticClient(ctx).json(spec.path, {
        query: compact(query) as Record<string, string>,
      });
      return wrapList(out);
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
  idHint?: string;
  outputKey: string;
}

export function getAction(spec: GetSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [{
      key: spec.idKey,
      label: spec.idLabel,
      type: "string",
      required: true,
      hint: spec.idHint,
    }],
    output: [{ key: spec.outputKey, type: "string", label: spec.idLabel }],
    async execute(input, ctx) {
      const id = String(input[spec.idKey] ?? "").trim();
      if (!id) throw new Error(`${spec.idLabel} is required`);
      return await new ElasticClient(ctx).json(spec.path.replace("{id}", encodeId(id)));
    },
  };
}
