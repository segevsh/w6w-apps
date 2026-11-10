import type { Param } from "@w6w/types";

/** The organization every Desk call is scoped to; empty = the one recorded on the connection. */
export const ORG_PARAM: Param = {
  key: "orgId",
  label: "Organization ID",
  type: "string",
  hint: "Zoho Desk orgId. Leave empty to use the one recorded when the connection was authorized.",
};

/** The `{ data: [...] }` list envelope every Desk list action answers with. */
export const dataOf = (result: unknown): unknown[] => (result as { data?: unknown[] }).data ?? [];

export const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");
