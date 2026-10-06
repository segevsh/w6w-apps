import type { ActionDefinition, Option, Param } from "@w6w/types";
import { asObject, compact, encodeId, LexwareClient } from "./client.ts";

type Input = Record<string, unknown>;

/** `page` + `size`; every paged endpoint documents both (max size 250 where a table gives one). */
export const pagingParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 0,
    validation: { min: 0, integer: true },
    hint: "Zero-based page index. Stop when the response's `last` is true.",
  },
  {
    key: "size",
    label: "Page size",
    type: "number",
    default: 25,
    validation: { min: 1, max: 250, integer: true },
    hint: "Default 25, at most 250. Lexware caps a search at 10,000 entries in total.",
  },
];

export const PAGE_OUTPUT = [
  { key: "content", type: "array" as const, label: "Items on this page" },
  { key: "last", type: "boolean" as const, label: "True on the final page" },
  { key: "totalPages", type: "number" as const, label: "Total pages" },
  { key: "totalElements", type: "number" as const, label: "Total matches (max 10,000)" },
  { key: "number", type: "number" as const, label: "This page's zero-based index" },
];

export const yesNo: Option[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

interface ListSpec {
  key: string;
  title: string;
  description: string;
  resource: string;
  path: string;
  paged: boolean;
  /** action param key -> wire query key. */
  query?: Record<string, string>;
  params?: Param[];
}

/** A GET list action. Query names come from the reference, per endpoint. */
export function listAction(spec: ListSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "search",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [...(spec.params ?? []), ...(spec.paged ? pagingParams : [])],
    output: spec.paged ? PAGE_OUTPUT : [{ key: "items", type: "array", label: spec.title }],
    async execute(input, ctx) {
      const query: Record<string, unknown> = {};
      for (const [from, to] of Object.entries(spec.query ?? {})) query[to] = input[from];
      if (spec.paged) {
        query.page = input.page;
        query.size = input.size;
      }
      const body = await new LexwareClient(ctx).json(spec.path, {
        query: compact(query) as Record<string, string>,
      });
      // Unpaged lists are bare arrays; wrap them so an output is always an object.
      return Array.isArray(body) ? { items: body } : body;
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
  output?: ActionDefinition["output"];
}

export function getAction(spec: GetSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [{ key: "id", label: spec.idLabel, type: "string", required: true }],
    output: spec.output ?? [{ key: "id", type: "string", label: "Id" }],
    async execute(input, ctx) {
      const id = String(input.id ?? "").trim();
      if (!id) throw new Error(`${spec.idLabel} is required`);
      const body = await new LexwareClient(ctx).json(spec.path.replace("{id}", encodeId(id)));
      return Array.isArray(body) ? { items: body } : body;
    },
  };
}

export const ACTION_RESULT_OUTPUT = [
  { key: "id", type: "string" as const, label: "Id" },
  { key: "resourceUri", type: "string" as const, label: "Resource URI" },
  { key: "version", type: "number" as const, label: "Version" },
];

interface SalesCreateSpec {
  key: string;
  title: string;
  noun: string;
  resource: string;
  path: string;
  /** Extra sentence for the `voucher` hint (required fields differ per type). */
  required: string;
}

/**
 * `POST /v1/<sales voucher>[?finalize=true]` — invoices, quotations, order confirmations and
 * credit notes share one shape: a JSON body of the document, draft unless `finalize` is set.
 * The body is taken as the vendor's own JSON rather than flattened into form fields, because
 * line items, tax conditions and shipping conditions are nested and vary by tax type.
 */
export function salesCreateAction(spec: SalesCreateSpec): ActionDefinition<Input> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.resource,
    title: spec.title,
    description: `Create ${spec.noun}. It is a draft unless Finalize is on; a finalized document ` +
      "cannot be changed through the API afterwards.",
    idempotent: false,
    params: [
      {
        key: "voucher",
        label: "Document (JSON)",
        type: "json",
        required: true,
        hint: `The request body exactly as Lexware documents it, without read-only fields. ` +
          spec.required,
      },
      {
        key: "finalize",
        label: "Finalize",
        type: "boolean",
        default: false,
        hint:
          "Create it with status `open` (numbered, with a rendered document) instead of `draft`.",
      },
    ],
    output: ACTION_RESULT_OUTPUT,
    async execute(input, ctx) {
      const body = asObject(input.voucher, "Document");
      return await new LexwareClient(ctx).json(spec.path, {
        method: "POST",
        query: input.finalize === true ? { finalize: "true" } : undefined,
        body,
      });
    },
  };
}
