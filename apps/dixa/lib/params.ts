import type { Param } from "@w6w/types";
import { compact, DixaClient, nextPageKey } from "./client.ts";

export const conversationIdParam: Param = {
  key: "conversationId",
  label: "Conversation id",
  type: "number",
  required: true,
  validation: { min: 1, integer: true },
  hint: "Dixa's numeric conversation id (the `csid`).",
};

export const pageParams: Param[] = [
  {
    key: "pageLimit",
    label: "Page size",
    type: "number",
    validation: { min: 1, integer: true },
    hint: "Maximum results per page. Dixa documents no ceiling; omit for its default.",
  },
  {
    key: "pageKey",
    label: "Page key",
    type: "string",
    hint: "The `nextPageKey` from the previous page. Opaque — never construct one.",
  },
];

/** Resolve a UUID-typed id param, trimmed, with a message that names it. */
export function requireText(value: unknown, label: string): string {
  const v = String(value ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  return v;
}

/** GET a paginated list and fold the opaque next-page link into `nextPageKey`. */
export async function pagedGet(
  client: DixaClient,
  path: string,
  query: Record<string, unknown>,
): Promise<{ data: unknown[]; nextPageKey?: string }> {
  const res = await client.json<{ data?: unknown[]; meta?: unknown }>(path, {
    query: compact(query) as Record<string, string>,
  });
  const key = nextPageKey(res?.meta);
  return { data: res?.data ?? [], ...(key ? { nextPageKey: key } : {}) };
}

export const pagedOutput = [
  { key: "data", type: "array", label: "Results" },
  { key: "nextPageKey", type: "string", label: "Page key for the next page (absent on the last)" },
] as const;
