import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/tag-synonym-list.ts";

export default pollFromListAction<{ site?: string }>({
  key: "new-tag-synonym",
  title: "New Tag Synonym",
  description: "The run gets each newly created tag synonym on the selected site.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    site: params.site ?? "stackoverflow",
    page: 1,
    pageSize: 100,
    sort: "creation",
    order: "desc",
  }),
  params: (action.params ?? []).filter((param) => param.key === "site"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const synonym = item as { from_tag?: unknown; to_tag?: unknown };
    return `${synonym.from_tag ?? ""}:${synonym.to_tag ?? ""}`;
  },
  output: [
    { key: "from_tag", type: "string", label: "Synonym tag" },
    { key: "to_tag", type: "string", label: "Master tag" },
    { key: "creation_date", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { from_tag: "js", to_tag: "javascript", creation_date: 1762646400 },
  maxPages: 1,
});
