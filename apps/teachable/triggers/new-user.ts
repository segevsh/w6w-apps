import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created Teachable user.",
  action,
  input: () => ({ page: 1, per: 100 }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "User ID" }],
  sample: { id: 101, email: "new@example.com" },
  maxPages: 1,
});
