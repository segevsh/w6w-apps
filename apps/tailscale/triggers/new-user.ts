import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly present in the tailnet member list.",
  action,
  input: () => ({ type: "member", role: "all" }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user_101", loginName: "new@example.com" },
  maxPages: 1,
});
