import type { ActionDefinition, HookContext, OutputField, Param } from "@w6w/types";
import {
  type JsonApiDocument,
  nextCursor,
  OutreachClient,
  type Query,
  relationship,
  requireId,
} from "./client.ts";

type Input = Record<string, unknown>;

export const DOC_OUTPUT: OutputField[] = [
  { key: "data", type: "object", label: "The JSON:API resource object" },
  { key: "included", type: "array", label: "Included related resources" },
];

export const LIST_OUTPUT: OutputField[] = [
  { key: "data", type: "array", label: "JSON:API resource objects" },
  { key: "included", type: "array", label: "Included related resources" },
  { key: "meta", type: "object", label: "Meta (carries `count` when count=true)" },
  { key: "nextCursor", type: "string", label: "Pass as `after` to fetch the next page" },
];

export const idParam = (label: string): Param => ({
  key: "id",
  label: `${label} ID`,
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
});

const includeParam: Param = {
  key: "include",
  label: "Include",
  type: "string",
  placeholder: "account,owner",
  hint: "Comma-separated relationships to embed under `included` (e.g. `account.owner,stage`).",
  advanced: true,
};

const fieldsParam = (type: string): Param => ({
  key: "fields",
  label: "Fields",
  type: "string",
  placeholder: "firstName,lastName",
  hint:
    `Sparse fieldset for ${type} resources: only these attributes are returned. Leave blank for all.`,
  advanced: true,
});

/** Standard collection params. Outreach's cursor pagination, filter and sort grammar. */
export function listParams(type: string, opts: { search?: boolean } = {}): Param[] {
  const params: Param[] = [];
  if (opts.search) {
    params.push({
      key: "search",
      label: "Search",
      type: "string",
      hint: "Prefix search across all searchable attributes (`filter[q]`).",
    });
  }
  params.push(
    {
      key: "filter",
      label: "Filters",
      type: "json",
      placeholder: '{"firstName": "Sally", "updatedAt": "2026-01-01..inf"}',
      hint:
        'Object of `filter[<attribute>]` values. Supports lists (`1,2,3`), ranges (`5..10`, `2026-01-01..inf`, `neginf..2026-01-01`), `__null__`/`__notnull__`, and relationship ids as nested objects (`{"account": {"id": "1,2"}}`). Not every attribute is filterable — see the Outreach API reference.',
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "-updatedAt",
      hint: "Attribute to sort by; prefix `-` for descending; comma-separate several.",
    },
    includeParam,
    fieldsParam(type),
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Records per page (`page[size]`). Outreach's own default is 50; the maximum is 1000.",
    },
    {
      key: "after",
      label: "After cursor",
      type: "string",
      hint: "The `nextCursor` from the previous page (`page[after]`).",
    },
    {
      key: "count",
      label: "Count total",
      type: "boolean",
      default: false,
      hint:
        "Ask Outreach to count all matches into `meta.count`. Off by default because counting is the most expensive stage of a collection query.",
    },
  );
  return params;
}

/** `filter` object -> `filter[a]=…` / `filter[a][b]=…` query entries. */
export function filterQuery(filter: unknown): Query {
  const q: Query = {};
  let value = filter;
  if (typeof value === "string" && value.trim()) value = JSON.parse(value);
  if (!value || typeof value !== "object") return q;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        q[`filter[${k}][${k2}]`] = String(v2);
      }
    } else if (v !== undefined && v !== null) {
      q[`filter[${k}]`] = Array.isArray(v) ? v.join(",") : String(v);
    }
  }
  return q;
}

function pageResult(doc: JsonApiDocument | null) {
  return {
    data: doc?.data ?? [],
    included: doc?.included ?? [],
    meta: doc?.meta ?? {},
    nextCursor: nextCursor(doc?.links),
  };
}

function docResult(doc: JsonApiDocument | null) {
  return { data: doc?.data ?? null, included: doc?.included ?? [] };
}

interface Base {
  key: string;
  title: string;
  /** Singular label, e.g. "Prospect". */
  noun: string;
  /** JSON:API `type`, e.g. "prospect". */
  type: string;
  /** Collection path segment, e.g. "prospects". */
  path: string;
}

export function listAction(
  b: Base & {
    description: string;
    search?: boolean;
    transform?: (d: JsonApiDocument | null) => JsonApiDocument | null;
  },
): ActionDefinition<Input> {
  return {
    key: b.key,
    type: "read",
    resource: b.type,
    title: b.title,
    description: b.description,
    params: listParams(b.type, { search: b.search }),
    output: LIST_OUTPUT,
    async execute(input, ctx: HookContext) {
      const query: Query = {
        ...filterQuery(input.filter),
        sort: input.sort as string | undefined,
        include: input.include as string | undefined,
        "page[size]": (input.pageSize as number | undefined) ?? 25,
        "page[after]": input.after as string | undefined,
        count: input.count === true ? "true" : "false",
      };
      if (input.search) query["filter[q]"] = String(input.search);
      if (input.fields) query[`fields[${b.type}]`] = String(input.fields);
      const doc = await new OutreachClient(ctx).send("GET", `/${b.path}`, { query });
      return pageResult(b.transform ? b.transform(doc) : doc);
    },
  };
}

export function getAction(
  b: Base & {
    description: string;
    transform?: (d: JsonApiDocument | null) => JsonApiDocument | null;
  },
): ActionDefinition<Input> {
  return {
    key: b.key,
    type: "read",
    resource: b.type,
    title: b.title,
    description: b.description,
    params: [idParam(b.noun), includeParam, fieldsParam(b.type)],
    output: DOC_OUTPUT,
    async execute(input, ctx) {
      const query: Query = { include: input.include as string | undefined };
      if (input.fields) query[`fields[${b.type}]`] = String(input.fields);
      const doc = await new OutreachClient(ctx).send(
        "GET",
        `/${b.path}/${requireId(input.id)}`,
        { query },
      );
      return docResult(b.transform ? b.transform(doc) : doc);
    },
  };
}

/** Maps an input param to a JSON:API to-one relationship. */
export interface RelParam {
  /** Input key, e.g. `accountId`. */
  param: string;
  /** Relationship name on this resource, e.g. `account`. */
  rel: string;
  /** Related resource type, e.g. `account`. */
  type: string;
}

function buildData(
  b: Base,
  attrKeys: string[],
  rels: RelParam[],
  input: Input,
  id?: number,
) {
  const attributes: Record<string, unknown> = {};
  // Escape hatch first, named params after: a named param always wins.
  const extra = typeof input.attributes === "string" && input.attributes.trim()
    ? JSON.parse(input.attributes)
    : input.attributes;
  if (extra && typeof extra === "object") Object.assign(attributes, extra);
  for (const k of attrKeys) {
    if (input[k] !== undefined && input[k] !== null && input[k] !== "") attributes[k] = input[k];
  }
  const relationships: Record<string, unknown> = {};
  for (const r of rels) {
    const v = input[r.param];
    if (v !== undefined && v !== null && v !== "") {
      relationships[r.rel] = relationship(r.type, v, r.param);
    }
  }
  const data: Record<string, unknown> = { type: b.type };
  if (id !== undefined) data.id = id;
  if (Object.keys(attributes).length) data.attributes = attributes;
  if (Object.keys(relationships).length) data.relationships = relationships;
  return { data };
}

export const attributesParam = (noun: string): Param => ({
  key: "attributes",
  label: "Other attributes",
  type: "json",
  advanced: true,
  hint:
    `Any further ${noun} attributes (including custom1…customN) as a JSON object, passed through verbatim. A named field above wins over the same key here.`,
});

interface WriteBase extends Base {
  description: string;
  /** Named attribute params (their `key` is the attribute name). */
  attrParams: Param[];
  relParams?: RelParam[];
  /** Extra non-attribute, non-relationship params to show (rare). */
  relFieldParams?: Param[];
  transform?: (d: JsonApiDocument | null) => JsonApiDocument | null;
}

export function createAction(b: WriteBase): ActionDefinition<Input> {
  const rels = b.relParams ?? [];
  return {
    key: b.key,
    type: "perform",
    resource: b.type,
    title: b.title,
    description: b.description,
    // A create is not safe to retry blindly: Outreach has no idempotency key.
    idempotent: false,
    params: [
      ...b.attrParams,
      ...(b.relFieldParams ?? []),
      attributesParam(b.noun.toLowerCase()),
    ],
    output: DOC_OUTPUT,
    async execute(input, ctx) {
      const body = buildData(b, b.attrParams.map((p) => p.key), rels, input);
      const doc = await new OutreachClient(ctx).send("POST", `/${b.path}`, { body });
      return docResult(b.transform ? b.transform(doc) : doc);
    },
  };
}

export function updateAction(b: WriteBase): ActionDefinition<Input> {
  const rels = b.relParams ?? [];
  const optional = b.attrParams.map((p) => ({ ...p, required: false }));
  return {
    key: b.key,
    type: "perform",
    resource: b.type,
    title: b.title,
    description: b.description,
    // PATCH sets the same fields to the same values: safe to retry.
    idempotent: true,
    params: [
      idParam(b.noun),
      ...optional,
      ...(b.relFieldParams ?? []),
      attributesParam(
        b.noun.toLowerCase(),
      ),
    ],
    output: DOC_OUTPUT,
    async execute(input, ctx) {
      const id = requireId(input.id);
      const body = buildData(b, b.attrParams.map((p) => p.key), rels, input, id);
      const doc = await new OutreachClient(ctx).send("PATCH", `/${b.path}/${id}`, { body });
      return docResult(b.transform ? b.transform(doc) : doc);
    },
  };
}

export function deleteAction(b: Base & { description: string }): ActionDefinition<Input> {
  return {
    key: b.key,
    type: "perform",
    resource: b.type,
    title: b.title,
    description: b.description,
    idempotent: false,
    params: [idParam(b.noun)],
    output: [
      { key: "deleted", type: "boolean", label: "True when Outreach answered 204" },
      { key: "id", type: "number", label: "The deleted ID" },
    ],
    async execute(input, ctx) {
      const id = requireId(input.id);
      await new OutreachClient(ctx).send("DELETE", `/${b.path}/${id}`);
      return { deleted: true, id };
    },
  };
}

/** `POST /<path>/{id}/actions/<action>` — Outreach's "member actions". */
export function memberAction(
  b: Base & {
    description: string;
    action: string;
    params?: Param[];
    /** Input keys sent as `actionParams[<key>]`. */
    actionParams?: string[];
  },
): ActionDefinition<Input> {
  return {
    key: b.key,
    type: "perform",
    resource: b.type,
    title: b.title,
    description: b.description,
    idempotent: false,
    params: [idParam(b.noun), ...(b.params ?? [])],
    output: DOC_OUTPUT,
    async execute(input, ctx) {
      const query: Query = {};
      for (const k of b.actionParams ?? []) {
        if (input[k] !== undefined && input[k] !== null && input[k] !== "") {
          query[`actionParams[${k}]`] = String(input[k]);
        }
      }
      const doc = await new OutreachClient(ctx).send(
        "POST",
        `/${b.path}/${requireId(input.id)}/actions/${b.action}`,
        { query },
      );
      return docResult(doc);
    },
  };
}
