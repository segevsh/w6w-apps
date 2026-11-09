import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import contactGetMany from "../actions/contact-get-many.ts";

const listItems = (result: unknown): unknown[] => {
  const seen = new Set<unknown>();
  const visit = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object" || seen.has(value)) return [];
    seen.add(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      const items = visit(child);
      if (items.length) return items;
    }
    return [];
  };
  return visit(result);
};

export default pollFromListAction<{ viewId: number }>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: contactGetMany as unknown as ActionDefinition,
  input: (params) => ({
    ...(params as Record<string, unknown>),
    sort: "created_at",
    sortType: "desc",
    page: 1,
    perPage: 100,
  }),
  items: listItems,
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
