import { pollFromListAction } from "../../_shared/poll/mod.ts";
import pullRequestList from "../actions/pull-request-list.ts";

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
  key: "new-pull-request",
  title: "New Pull Request",
  description: "The run gets each newly created pull request.",
  action: pullRequestList,
  input: (params) => ({
    ...(params as Record<string, unknown>),
    sort: "recentupdate",
    state: "open",
    page: 1,
    limit: 50,
  }),
  items: listItems,
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Pull Request ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
