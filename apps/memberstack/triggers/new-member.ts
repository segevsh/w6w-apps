import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/member-list.ts";

const trigger = pollFromListAction({
  key: "new-member",
  title: "New Member",
  description: "Fires for newly created members.",
  action,
  input: () => ({ limit: 100, order: "DESC" }),
  items: (result) => (result as { members?: unknown[] }).members ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [{ key: "id", type: "string", label: "Member ID" }],
  sample: { id: "mem-1" },
  maxPages: 1,
});

export default trigger;
