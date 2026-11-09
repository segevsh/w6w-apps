import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listGammaComments from "../actions/list-gamma-comments.ts";

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

export default pollFromListAction<{ gammaId: string }>({
  key: "new-gamma-comment",
  title: "New Gamma Comment",
  description: "The run gets each newly created gamma comment.",
  action: listGammaComments as unknown as ActionDefinition,
  input: (params) => ({ ...(params as Record<string, unknown>), limit: 50 }),
  items: listItems,
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Comment ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
