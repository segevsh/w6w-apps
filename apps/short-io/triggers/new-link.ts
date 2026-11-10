import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/link-list.ts";

interface Item {
  idString?: string;
}

const newLink = pollFromListAction({
  key: "new-link",
  title: "New Link",
  description: "The run gets each newly created link.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, limit: 100, dateSortOrder: "desc" }),
  items: (result) => {
    const r = result as { links?: unknown[] };
    return r.links ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.idString ?? "");
  },
  params: action.params,
  output: [{ key: "idString", type: "string", label: "Link ID" }],
  sample: { idString: "link-a" },
  maxPages: 1,
});

export default newLink;
