import { pollFromListAction } from "../../_shared/poll/mod.ts";
import groupList from "../actions/group-list.ts";

export default pollFromListAction({
  key: "new-group",
  title: "New Group",
  description:
    "The run gets each newly created CleverReach group (receiver list), ordered by `created DESC`.",
  action: groupList,
  input: () => ({ order: "created DESC" }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Group name" },
  ],
  sample: { id: 123456, name: "Newsletter" },
  maxPages: 1,
});
