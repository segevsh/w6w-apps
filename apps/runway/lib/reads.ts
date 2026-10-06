import type { ActionDefinition, OutputField, Param } from "@w6w/types";
import { need, RunwayClient } from "./client.ts";

/** Cursor pagination shared by the list endpoints (voices, avatars, routers). */
export const LIST_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 20,
    validation: { min: 1, max: 100, integer: true },
    hint: "Page size, 1-100 (the vendor requires it).",
  },
  { key: "cursor", label: "Cursor", type: "string", hint: "`nextCursor` from the previous page." },
];

export const LIST_OUTPUT: OutputField[] = [
  { key: "hasMore", type: "boolean", label: "Another page exists" },
  { key: "nextCursor", type: "string", label: "Cursor for the next page" },
];

interface ListInput {
  limit?: number;
  cursor?: string;
}

/** `GET <path>?limit&cursor` answering `{ data, hasMore, nextCursor }`. */
export function listAction(
  key: string,
  title: string,
  description: string,
  resource: string,
  path: string,
  itemsKey: string,
): ActionDefinition<ListInput> {
  return {
    key,
    type: "search",
    resource,
    title,
    description,
    params: LIST_PARAMS,
    output: [{ key: itemsKey, type: "array", label: title }, ...LIST_OUTPUT],
    async execute(input, ctx) {
      const { data } = await new RunwayClient(ctx).request(path, {
        query: { limit: input.limit ?? 20, cursor: input.cursor },
      });
      const d = (data ?? {}) as { data?: unknown[]; hasMore?: boolean; nextCursor?: string | null };
      return { [itemsKey]: d.data ?? [], hasMore: d.hasMore ?? false, nextCursor: d.nextCursor };
    },
  };
}

interface IdInput {
  id: string;
}

/** `GET <path>/{id}` returning the vendor object under one key. */
export function getAction(
  key: string,
  title: string,
  description: string,
  resource: string,
  path: string,
  outputKey: string,
  idLabel: string,
): ActionDefinition<IdInput> {
  return {
    key,
    type: "read",
    resource,
    title,
    description,
    params: [{ key: "id", label: idLabel, type: "string", required: true }],
    output: [{ key: outputKey, type: "object", label: title }],
    async execute(input, ctx) {
      const { data } = await new RunwayClient(ctx).request(
        `${path}/${encodeURIComponent(need(input.id, "id"))}`,
      );
      return { [outputKey]: data };
    },
  };
}
