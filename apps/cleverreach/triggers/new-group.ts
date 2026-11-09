import { pollFromListAction } from "../../_shared/poll/mod.ts";
import groupList from "../actions/group-list.ts";
export default pollFromListAction({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created CleverReach group.",
  action: groupList,
  input: () => ({ order: "created DESC" }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Group ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
