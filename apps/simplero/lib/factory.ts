import type { ActionDefinition, HookContext, Param } from "@w6w/types";
import { type QueryObject, SimpleroClient } from "./client.ts";
import { idParam, type PageInput, pageQuery, paginationParams, searchParam } from "./params.ts";

/** Output of every collection action. */
export const listOutput = (label: string) => [
  { key: "items", type: "array" as const, label },
  { key: "page", type: "number" as const, label: "Current page (null under cursor paging)" },
  { key: "perPage", type: "number" as const, label: "Results per page" },
  { key: "total", type: "number" as const, label: "Total records (null under cursor paging)" },
  { key: "totalPages", type: "number" as const, label: "Total pages (null under cursor paging)" },
  { key: "nextAfter", type: "number" as const, label: "Cursor for the next page" },
  { key: "hasMore", type: "boolean" as const, label: "Whether another page is available" },
];

interface ListOptions<I extends PageInput> {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string;
  itemsLabel: string;
  /** Resource-specific filters, shown after the shared pagination/search params. */
  params?: Param[];
  /** Extra query keys derived from the resource-specific inputs. */
  query?: (input: I) => QueryObject;
  /** Set false for the few collections Simplero gives no `q` search. */
  search?: boolean;
}

/** A `GET /api/v2/<collection>` read action. */
export function listAction<I extends PageInput>(opts: ListOptions<I>): ActionDefinition<I> {
  return {
    key: opts.key,
    type: "read",
    resource: opts.resource,
    title: opts.title,
    description: opts.description,
    params: [
      ...(opts.search === false ? [] : [searchParam]),
      ...(opts.params ?? []),
      ...paginationParams,
    ],
    output: listOutput(opts.itemsLabel),
    async execute(input: I, ctx: HookContext) {
      const base = pageQuery(opts.search === false ? { ...input, q: undefined } : input);
      return await new SimpleroClient(ctx).list(opts.path, {
        ...base,
        ...(opts.query?.(input) ?? {}),
      } as QueryObject);
    },
  };
}

interface GetOptions {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string;
  idLabel: string;
  outputLabel: string;
}

/** A `GET /api/v2/<collection>/{id}` read action. */
export function getAction(opts: GetOptions): ActionDefinition<{ id: number }> {
  return {
    key: opts.key,
    type: "read",
    resource: opts.resource,
    title: opts.title,
    description: opts.description,
    params: [idParam(opts.idLabel)],
    output: [{ key: "record", type: "object", label: opts.outputLabel }],
    async execute(input, ctx) {
      const record = await new SimpleroClient(ctx).one(`${opts.path}/${input.id}`);
      return { record };
    },
  };
}

interface ContactActionOptions<I extends { id: number }> {
  key: string;
  title: string;
  description: string;
  /** The `<name>` in `/customers/{id}/actions/<name>`. */
  action: string;
  params: Param[];
  body: (input: I) => Record<string, unknown>;
  idempotent: boolean;
}

/** A `POST /api/v2/customers/{id}/actions/<name>` perform action. */
export function contactAction<I extends { id: number }>(
  opts: ContactActionOptions<I>,
): ActionDefinition<I> {
  return {
    key: opts.key,
    type: "perform",
    resource: "contact",
    title: opts.title,
    description: opts.description,
    idempotent: opts.idempotent,
    params: opts.params,
    output: [
      { key: "success", type: "boolean", label: "Whether Simplero reported success" },
      { key: "message", type: "string", label: "Simplero's message, if any" },
    ],
    async execute(input: I, ctx: HookContext) {
      return await new SimpleroClient(ctx).callAction(
        `/customers/${input.id}/actions/${opts.action}`,
        opts.body(input),
      );
    },
  };
}
