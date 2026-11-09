import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created user.",
  action,
  input: () => ({ limit: 100, maxPages: 1 }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user-101" },
  maxPages: 1,
});
