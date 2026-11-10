import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created user.",
  action: userList as ActionDefinition,
  input: (_params) => ({ limit: 100 }),
  items: (r) => (r as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),

  output: [{ key: "id", type: "string", label: "New User ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
