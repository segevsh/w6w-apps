import type { ActionDefinition, Param } from "@w6w/types";
import { encodeId, PaystackClient, type QueryValue, required } from "./client.ts";

/** Shared pagination params for the offset-paginated list endpoints. */
export const paginationParams: Param[] = [
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    hint: "Records per page. Paystack's default is 50.",
    validation: { integer: true, min: 1 },
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "1-based page number.",
    validation: { integer: true, min: 1 },
  },
];

export const dateRangeParams: Param[] = [
  {
    key: "from",
    label: "From",
    type: "string",
    hint: "ISO 8601 timestamp; records created at or after it.",
  },
  {
    key: "to",
    label: "To",
    type: "string",
    hint: "ISO 8601 timestamp; records created at or before it.",
  },
];

export const listOutput = [
  { key: "items", type: "array" as const, label: "Records on this page" },
  {
    key: "meta",
    type: "object" as const,
    label: "Pagination meta",
    description: "total, skipped, perPage, page, pageCount.",
  },
];

interface ListSpec {
  key: string;
  title: string;
  description: string;
  resource: string;
  path: string;
  /** Extra input keys -> query keys, beyond perPage/page/from/to. */
  query?: Record<string, string>;
  params: Param[];
  /** Send `per_page` as well as `perPage` (the OpenAPI document spells it that way). */
  paginated?: boolean;
}

/** A `GET /<resource>` list action returning `{items, meta}`. */
export function listAction(spec: ListSpec): ActionDefinition<Record<string, unknown>> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: listOutput,
    async execute(input, ctx) {
      const query: Record<string, QueryValue> = {
        perPage: input.perPage as number | undefined,
        per_page: input.perPage as number | undefined,
        page: input.page as number | undefined,
      };
      if (spec.params.some((p) => p.key === "from")) {
        query.from = input.from as string | undefined;
        query.to = input.to as string | undefined;
      }
      for (const [inKey, qKey] of Object.entries(spec.query ?? {})) {
        query[qKey] = input[inKey] as QueryValue;
      }
      return await new PaystackClient(ctx).list(spec.path, query);
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
  idLabel: string;
  idHint: string;
  output: Array<
    { key: string; type: "string" | "number" | "boolean" | "object" | "array"; label: string }
  >;
}

/** A `GET /<resource>/{id}` action returning the record's `data`. */
export function getAction(spec: GetSpec): ActionDefinition<{ id: string }> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [{ key: "id", label: spec.idLabel, type: "string", required: true, hint: spec.idHint }],
    output: spec.output,
    async execute(input, ctx) {
      const id = required(input.id, spec.idLabel);
      return await new PaystackClient(ctx).data(spec.path.replace("{id}", encodeId(id)));
    },
  };
}
