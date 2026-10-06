import type { ActionDefinition, OutputField, Param } from "@w6w/types";
import { ActionNetworkClient, MAX_PAGE_SIZE, need } from "./client.ts";

export type Input = Record<string, unknown>;

/** Output of every list action — a flattened HAL collection. */
export const PAGE_OUTPUT: OutputField[] = [
  { key: "items", type: "array", label: "Resources on this page, each with a plain `id`" },
  { key: "page", type: "number", label: "Page number returned" },
  { key: "perPage", type: "number", label: "Page size used" },
  {
    key: "totalPages",
    type: "number",
    label: "Total pages (omitted by the vendor on some collections, e.g. people)",
  },
  { key: "totalRecords", type: "number", label: "Total records (omitted on some collections)" },
  { key: "hasMore", type: "boolean", label: "True when a next page exists" },
];

/** `page`, `per_page` (max 25) and an OData `filter`. */
export function pagingParams(filterFields?: string): Param[] {
  return [
    ...(filterFields
      ? [
        {
          key: "filter",
          label: "OData filter",
          type: "string",
          placeholder: "modified_date gt '2026-01-01'",
          hint:
            `field operator 'value', with eq, gt or lt. Fields the vendor documents here: ${filterFields}.`,
        } satisfies Param,
      ]
      : []),
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "perPage",
      label: "Page size",
      type: "number",
      hint: `Defaults to ${MAX_PAGE_SIZE}, which is also the maximum.`,
      validation: { min: 1, max: MAX_PAGE_SIZE, integer: true },
    },
  ];
}

interface ListOptions {
  key: string;
  resource: string;
  title: string;
  description: string;
  /** Path of the collection, e.g. `/petitions`. May read parent ids from the input. */
  path: (input: Input) => string;
  /** Parent id params (e.g. `petitionId`). */
  params?: Param[];
  /** Omit when the vendor documents no OData filter for the collection. */
  filterFields?: string;
}

/** A page-numbered `GET <collection>` returning `{ items, page, perPage, ..., hasMore }`. */
export function listAction(o: ListOptions): ActionDefinition<Input> {
  return {
    key: o.key,
    type: "search",
    resource: o.resource,
    title: o.title,
    description: o.description,
    params: [...(o.params ?? []), ...pagingParams(o.filterFields)],
    output: PAGE_OUTPUT,
    execute(input, ctx) {
      return new ActionNetworkClient(ctx).list(o.path(input), input);
    },
  };
}

interface GetOptions {
  key: string;
  resource: string;
  title: string;
  description: string;
  params: Param[];
  path: (input: Input) => string;
  output: OutputField[];
}

/** `GET <resource>/{id}` returning the flattened resource. */
export function getAction(o: GetOptions): ActionDefinition<Input> {
  return {
    key: o.key,
    type: "read",
    resource: o.resource,
    title: o.title,
    description: o.description,
    params: o.params,
    output: o.output,
    execute(input, ctx) {
      return new ActionNetworkClient(ctx).get(o.path(input));
    },
  };
}

/** A required id param. */
export function idParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "string", required: true, ...(hint ? { hint } : {}) };
}

/** An optional id param, for actions that can be scoped one of two ways. */
export function optionalIdParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "string", ...(hint ? { hint } : {}) };
}

/**
 * Pick the collection a record lives under: its parent action (`parentKey`, e.g. a petition) or
 * the person (`/people/{id}/<tail>`). Exactly one must be given.
 */
export function scopedPath(
  input: Input,
  parent: { key: string; base: string },
  tail: string,
  fallback?: string,
): string {
  const parentId = input[parent.key];
  const personId = input.personId;
  const hasParent = parentId !== undefined && String(parentId).trim() !== "";
  const hasPerson = personId !== undefined && String(personId).trim() !== "";
  if (hasParent && hasPerson) throw new Error(`give ${parent.key} or personId, not both`);
  if (hasParent) return `${parent.base}/${encodeURIComponent(clean(parentId))}/${tail}`;
  if (hasPerson) return `/people/${encodeURIComponent(clean(personId))}/${tail}`;
  if (fallback) return fallback;
  throw new Error(`${parent.key} or personId is required`);
}

function clean(v: unknown): string {
  return String(v).trim().replace(/^action_network:/, "");
}

/** `id` of the record in a scoped GET, with the same either-or rule as the list. */
export function scopedItemPath(
  input: Input,
  parent: { key: string; base: string },
  tail: string,
  idKey: string,
  fallback?: string,
): string {
  const id = encodeURIComponent(clean(need(input, idKey)));
  const base = scopedPath(input, parent, tail, fallback ? fallback : undefined);
  return `${base}/${id}`;
}
