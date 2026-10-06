import type { Param } from "@w6w/types";
import { compact } from "./client.ts";

/**
 * Shared `Param` fragments. Every name, enum and description is from Raisely's OpenAPI document
 * (components.parameters `Private`, `Search`, `Limit`, `Offset`, `Sort`, `Order`), fetched
 * 2026-10-06.
 */

/** `private` — without it an authenticated read returns only the public fields. */
export function privateParam(): Param {
  return {
    key: "private",
    label: "Full (private) record",
    type: "boolean",
    default: true,
    hint: "Raisely returns only public fields unless private=true is sent with a valid key.",
  };
}

/** `q` / `limit` / `offset` / `sort` / `order` — the list parameters every collection shares. */
export function listParams(): Param[] {
  return [
    { key: "q", label: "Search", type: "string", hint: "Search query to find matching records." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Records per page. Leave empty for Raisely's own default.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint:
        "Number of records to skip. Page through with `pagination.nextUrl` / `pagination.pages`.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "string",
      hint: "Record attribute to sort on; used together with Order.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      hint: "Only applied if Sort by is also given.",
    },
  ];
}

export interface ListInput {
  private?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: string;
}

export function listQuery(input: ListInput): Record<string, string | number | boolean> {
  return compact({
    private: input.private,
    q: input.q,
    limit: input.limit,
    offset: input.offset,
    sort: input.sort,
    order: input.order,
  }) as Record<string, string | number | boolean>;
}

/** `public` / `private` custom-field objects, taken as JSON. */
export function customFieldParams(): Param[] {
  return [
    {
      key: "public",
      label: "Public custom fields",
      type: "json",
      hint: 'Object of public custom values, e.g. {"fieldA": "one"}.',
    },
    {
      key: "private_fields",
      label: "Private custom fields",
      type: "json",
      hint: 'Object of private custom values, e.g. {"fieldA": "one"}. Sent as `private`.',
    },
  ];
}

export function overwriteParam(): Param {
  return {
    key: "overwriteCustomFields",
    label: "Overwrite custom fields",
    type: "boolean",
    hint: "Replace the record's existing public/private values instead of merging into them.",
  };
}
