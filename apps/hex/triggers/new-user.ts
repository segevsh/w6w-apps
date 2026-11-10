import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each new workspace user.",
  action: userList,
  input: () => ({ limit: 500, sortBy: "NAME", sortDirection: "DESC" }),
  items: (result) => (result as { values?: unknown[] }).values ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user-1", email: "ada@example.com" },
  maxPages: 1,
});
