import { pollFromListAction } from "../../_shared/poll/mod.ts";
import usersList from "../actions/users-list.ts";

/** Poll the vendor-documented newest-first user page. */
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly registered user.",
  action: usersList,
  input: () => ({ page: 1, itemsPerPage: 200 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "usr_123" },
  maxPages: 1,
});
