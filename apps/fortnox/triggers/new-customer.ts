import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

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

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer.",
  action: customerList,
  input: (params) => ({
    ...(params as Record<string, unknown>),
    limit: 100,
    page: 1,
    lastModified: "1970-01-01",
  }),
  items: listItems,
  idOf: (item) => String((item as { CustomerNumber?: unknown }).CustomerNumber ?? ""),
  output: [{ key: "CustomerNumber", type: "string", label: "Customer Number" }],
  sample: { CustomerNumber: "example-1" },
  maxPages: 1,
});
