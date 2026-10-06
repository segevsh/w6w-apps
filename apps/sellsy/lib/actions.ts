import type { ActionDefinition, HookContext, Param } from "@w6w/types";
import { call, type Query, seg } from "./client.ts";

/**
 * Sellsy v2 is uniform: every resource has `GET /x`, `POST /x/search`,
 * `GET|PUT|DELETE /x/{id}` and the same `{pagination, data}` list envelope, so
 * the actions are declared as data and built here. Each action still lives in
 * its own file under `actions/` and default-exports the finished definition.
 */

/** How a form value becomes a JSON value on the wire. */
export type Coerce = "str" | "int" | "number" | "bool" | "intList" | "strList" | "json";

export interface Field {
  key: string;
  label: string;
  type?: Param["type"];
  as?: Coerce;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Option values for a `select`. */
  options?: string[];
  default?: string | number | boolean;
}

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim()).filter(Boolean);

/** Returns `undefined` for an empty value so it is left out of the request. */
export function coerce(key: string, value: unknown, as: Coerce = "str"): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  switch (as) {
    case "int":
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
      return n;
    }
    case "bool":
      return value === true || value === "true";
    case "intList":
      return asList(value).map((s) => {
        const n = Number(s);
        if (!Number.isInteger(n)) throw new Error(`${key} must be a list of integer IDs`);
        return n;
      });
    case "strList":
      return asList(value);
    case "json":
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`${key} must be valid JSON`);
        }
      }
      return value;
    default:
      return value;
  }
}

function toParam(f: Field): Param {
  const type = f.type ??
    (f.options ? "select" : f.as === "bool" ? "boolean" : f.as === "json" ? "json" : "string");
  const p: Record<string, unknown> = { key: f.key, label: f.label, type };
  if (f.required) p.required = true;
  if (f.hint) p.hint = f.hint;
  if (f.placeholder) p.placeholder = f.placeholder;
  if (f.default !== undefined) p.default = f.default;
  if (f.options) p.options = f.options.map((v) => ({ value: v, label: v }));
  return p as unknown as Param;
}

/** Collects the coerced values of `fields` out of `input` into a body/filter object. */
export function collect(fields: Field[], input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = coerce(f.key, input[f.key], f.as);
    if (v !== undefined) out[f.key] = v;
  }
  return out;
}

const idField = (label: string): Field => ({
  key: "id",
  label,
  as: "int",
  required: true,
});

const embedField = (embeds?: string[]): Field => ({
  key: "embed",
  label: "Embed",
  hint: "Comma-separated extra objects to include" +
    (embeds ? ` (${embeds.join(", ")})` : "") +
    "; `cf.<id>` embeds a custom field. Each may need its own OAuth scope.",
});

const extraField = (what: string): Field => ({
  key: "extra",
  label: "Additional fields (JSON)",
  as: "json",
  hint:
    `A JSON object merged over the fields above — for any ${what} field this form does not list.`,
});

const embedQuery = (input: Record<string, unknown>): Query => {
  const embed = input.embed ? asList(input.embed) : [];
  return embed.length ? { embed } : {};
};

type Execute = (input: Record<string, unknown>, ctx: HookContext) => Promise<unknown>;

function define(
  base: Pick<ActionDefinition, "key" | "type" | "title" | "description">,
  fields: Field[],
  output: { key: string; label: string; type: "json" | "number" | "boolean" }[],
  execute: Execute,
  idempotent?: boolean,
): ActionDefinition {
  const def: Record<string, unknown> = {
    ...base,
    params: fields.map(toParam),
    output,
    execute,
  };
  if (base.type === "perform") def.idempotent = idempotent ?? false;
  return def as unknown as ActionDefinition;
}

const PAGE_FIELDS: Field[] = [
  {
    key: "limit",
    label: "Limit",
    as: "int",
    type: "number",
    default: 25,
    hint: "1–100 per page (Sellsy's maximum is 100; the default is 25).",
  },
  {
    key: "offset",
    label: "Offset",
    hint: "Leave empty for the first page. Pass the `pagination.offset` of the previous page to " +
      "continue (an opaque cursor, or a numeric page when you started with 0).",
  },
];

const orderFields = (orders?: string[]): Field[] =>
  orders
    ? [
      { key: "order", label: "Order by", options: orders },
      { key: "direction", label: "Direction", options: ["asc", "desc"] },
    ]
    : [];

function pageQuery(input: Record<string, unknown>): Query {
  const limit = coerce("limit", input.limit, "int") as number | undefined;
  if (limit !== undefined && (limit < 1 || limit > 100)) {
    throw new Error("limit must be between 1 and 100");
  }
  return {
    limit: limit ?? 25,
    offset: input.offset === undefined || input.offset === null || input.offset === ""
      ? undefined
      : String(input.offset),
    order: input.order as string | undefined,
    direction: input.direction as string | undefined,
    ...embedQuery(input),
  };
}

const LIST_OUTPUT = [
  { key: "data", type: "json" as const, label: "Records on this page" },
  { key: "pagination", type: "json" as const, label: "limit, count, total and the next offset" },
  { key: "aggregations", type: "json" as const, label: "Totals, where the endpoint returns them" },
];

function listResult(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    data: b.data ?? [],
    pagination: b.pagination ?? null,
    aggregations: b.aggregations ?? null,
  };
}

export interface SearchCfg {
  key: string;
  noun: string;
  path: string;
  scope: string;
  orders?: string[];
  embeds?: string[];
  filters: Field[];
}

/** `POST /<path>/search` — the filtered list. `filters` is required by the API, even when empty. */
export function searchAction(c: SearchCfg): ActionDefinition {
  const fields: Field[] = [
    ...c.filters,
    {
      key: "filters",
      label: "Additional filters (JSON)",
      as: "json",
      hint: "A JSON object merged into the search `filters`, for filters not listed above.",
    },
    ...PAGE_FIELDS,
    ...orderFields(c.orders),
    embedField(c.embeds),
  ];
  return define(
    {
      key: `${c.key}-search`,
      type: "search",
      title: `Search ${c.noun}`,
      description:
        `Search ${c.noun} with filters, one page at a time. Needs the \`${c.scope}\` scope.`,
    },
    fields,
    LIST_OUTPUT,
    async (input, ctx) => {
      const filters = {
        ...collect(c.filters, input),
        ...((coerce("filters", input.filters, "json") as object) ?? {}),
      };
      return listResult(
        await call(ctx, `${c.path}/search`, {
          method: "POST",
          query: pageQuery(input),
          body: { filters },
        }),
      );
    },
  );
}

export interface ListCfg {
  key: string;
  noun: string;
  path: string;
  scope: string;
  orders?: string[];
  description?: string;
}

/** `GET /<path>` — a plain paged list. */
export function listAction(c: ListCfg): ActionDefinition {
  return define(
    {
      key: c.key,
      type: "read",
      title: `List ${c.noun}`,
      description: c.description ?? `List ${c.noun}. Needs the \`${c.scope}\` scope.`,
    },
    [...PAGE_FIELDS, ...orderFields(c.orders)],
    LIST_OUTPUT,
    async (input, ctx) => listResult(await call(ctx, c.path, { query: pageQuery(input) })),
  );
}

export interface GetCfg {
  key: string;
  noun: string;
  path: string;
  scope: string;
  resultKey: string;
  embeds?: string[];
}

/** `GET /<path>/{id}`. */
export function getAction(c: GetCfg): ActionDefinition {
  return define(
    {
      key: c.key,
      type: "read",
      title: `Get ${c.noun}`,
      description: `Retrieve one ${c.noun} by its ID. Needs the \`${c.scope}\` scope.`,
    },
    [idField(`${c.noun} ID`), embedField(c.embeds)],
    [{ key: c.resultKey, type: "json", label: c.noun }],
    async (input, ctx) => ({
      [c.resultKey]: await call(ctx, `${c.path}/${seg(input.id)}`, { query: embedQuery(input) }),
    }),
  );
}

export interface WriteCfg {
  key: string;
  noun: string;
  path: string;
  scope: string;
  resultKey: string;
  fields: Field[];
  /** `create` posts to `path`; `update` sends `method` to `path/{id}`. */
  mode: "create" | "update";
  method?: "PUT" | "PATCH";
  /** Append `?verify=true` support (dry-run validation) — not exposed; kept off. */
  description?: string;
}

/** `POST /<path>` or `PUT|PATCH /<path>/{id}`. */
export function writeAction(c: WriteCfg): ActionDefinition {
  const update = c.mode === "update";
  const fields: Field[] = [
    ...(update ? [idField(`${c.noun} ID`)] : []),
    ...c.fields,
    extraField(c.noun),
  ];
  return define(
    {
      key: `${c.key}-${c.mode}`,
      type: "perform",
      title: `${update ? "Update" : "Create"} ${c.noun}`,
      description: c.description ??
        (update
          ? `Update ${c.noun} fields; omitted fields are left unchanged. Needs the \`${c.scope}\` scope.`
          : `Create a ${c.noun}. Needs the \`${c.scope}\` scope.`),
    },
    fields,
    [{ key: c.resultKey, type: "json", label: c.noun }],
    async (input, ctx) => {
      const body = {
        ...collect(c.fields, input),
        ...((coerce("extra", input.extra, "json") as object) ?? {}),
      };
      if (update && Object.keys(body).length === 0) {
        throw new Error(`Nothing to update — set at least one ${c.noun} field`);
      }
      const result = await call(ctx, update ? `${c.path}/${seg(input.id)}` : c.path, {
        method: update ? (c.method ?? "PUT") : "POST",
        body,
      });
      return { [c.resultKey]: result ?? { id: update ? input.id : null } };
    },
    update, // a PUT/PATCH of the same values is safe to retry; a create is not
  );
}

export interface DeleteCfg {
  key: string;
  noun: string;
  path: string;
  scope: string;
}

/** `DELETE /<path>/{id}` — answers 204. */
export function deleteAction(c: DeleteCfg): ActionDefinition {
  return define(
    {
      key: `${c.key}-delete`,
      type: "perform",
      title: `Delete ${c.noun}`,
      description: `Delete a ${c.noun}. Needs the \`${c.scope}\` scope.`,
    },
    [idField(`${c.noun} ID`)],
    [
      { key: "id", type: "number", label: "Deleted ID" },
      { key: "deleted", type: "boolean", label: "True once Sellsy confirmed" },
    ],
    async (input, ctx) => {
      await call(ctx, `${c.path}/${seg(input.id)}`, { method: "DELETE" });
      return { id: Number(input.id), deleted: true };
    },
    true,
  );
}

export { define, idField, PAGE_FIELDS };
