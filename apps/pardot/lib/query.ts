import type { ActionDefinition, Param } from "@w6w/types";
import { idOf, PardotClient, type Query, unset } from "./client.ts";
import { deletedParam, fieldsParam, pageOutput } from "./params.ts";

/**
 * Every v5 object answers the same query contract (Version 5 Overview, "Query"):
 * `fields` (required by the API), `limit` (1–1000, default 200), `orderBy`
 * (one field + optional ASC/DESC), `deleted`, then per-object filter
 * parameters. Pagination is `nextPageToken`: the follow-up call carries ONLY
 * `fields` + the token — `orderBy`, `offset`, `limit` and any filter alongside a
 * token is a 400 — so this factory strips them when a token is given.
 */
export interface QuerySpec {
  key: string;
  title: string;
  description: string;
  /** Collection segment of the URL, e.g. `prospects`. */
  path: string;
  /** Editor grouping. */
  resource: string;
  defaultFields: string;
  /** Fields the docs list as valid `orderBy` targets. */
  orderBy: string[];
  /** Per-object filter parameters; each `key` is sent as the query parameter of the same name. */
  filters: Param[];
  /** Whether the object goes to the recycle bin (the docs' `deleted` parameter). */
  supportsDeleted?: boolean;
}

interface QueryInput {
  fields?: string;
  limit?: number;
  orderBy?: string;
  deleted?: string;
  nextPageToken?: string;
  [filter: string]: unknown;
}

interface Page {
  values?: unknown[];
  nextPageToken?: string | null;
  nextPageUrl?: string | null;
}

export function checkOrderBy(raw: string | undefined, allowed: string[]): string | undefined {
  const value = unset(raw?.trim());
  if (value === undefined) return undefined;
  const [field, direction, ...rest] = value.split(/\s+/);
  const ok = allowed.includes(field) && rest.length === 0 &&
    (direction === undefined || /^(ASC|DESC)$/i.test(direction));
  if (!ok) {
    throw new Error(
      `\`orderBy\` must be one of ${allowed.join(", ")}, optionally followed by ASC or DESC.`,
    );
  }
  return value;
}

export function queryAction(spec: QuerySpec): ActionDefinition<QueryInput> {
  const params: Param[] = [
    fieldsParam(spec.defaultFields),
    ...spec.filters,
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 200,
      validation: { min: 1, max: 1000, integer: true },
      hint: "1–1000, the API's default is 200.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      placeholder: `${spec.orderBy[0]} DESC`,
      hint: `One of: ${spec.orderBy.join(", ")}, optionally followed by ASC or DESC.`,
    },
    ...(spec.supportsDeleted === false ? [] : [deletedParam]),
    {
      key: "nextPageToken",
      label: "Next page token",
      type: "string",
      hint:
        "Pass the `nextPageToken` from the previous page to continue. Every filter, order and limit is then ignored — the token pins them. Tokens expire after 4 hours and stop after 100,000 records.",
    },
  ];

  return {
    key: spec.key,
    type: "search",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params,
    output: pageOutput,

    async execute(input, ctx) {
      const fields = unset(input.fields) ?? spec.defaultFields;
      const token = unset(input.nextPageToken);

      let query: Query;
      if (token !== undefined) {
        // The API rejects any other parameter next to a page token.
        query = { fields, nextPageToken: token };
      } else {
        query = {
          fields,
          limit: unset(input.limit),
          orderBy: checkOrderBy(input.orderBy, spec.orderBy),
          deleted: spec.supportsDeleted === false ? undefined : unset(input.deleted),
        };
        for (const f of spec.filters) {
          const v = unset(input[f.key] as string | number | undefined);
          if (v !== undefined) query[f.key] = v;
        }
      }

      const page = await new PardotClient(ctx).request<Page>(`/${spec.path}`, { query });
      return {
        values: page?.values ?? [],
        nextPageToken: page?.nextPageToken ?? null,
        nextPageUrl: page?.nextPageUrl ?? null,
      };
    },
  };
}

export interface GetSpec {
  key: string;
  title: string;
  description: string;
  path: string;
  resource: string;
  defaultFields: string;
  idLabel: string;
}

export function getAction(spec: GetSpec): ActionDefinition<{ id: number; fields?: string }> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [
      { key: "id", label: spec.idLabel, type: "number", required: true },
      fieldsParam(spec.defaultFields),
    ],
    output: [{ key: "id", type: "number", label: "ID" }],

    execute(input, ctx) {
      return new PardotClient(ctx).request(`/${spec.path}/${idOf(input.id)}`, {
        query: { fields: unset(input.fields) ?? spec.defaultFields },
      });
    },
  };
}
