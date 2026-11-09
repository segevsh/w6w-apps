import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created Clerk user.",
  action: userList,
  input: () => ({ limit: 100, offset: 0 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user_1" },
  maxPages: 1,
});
