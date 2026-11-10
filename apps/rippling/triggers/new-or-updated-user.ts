import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-or-updated-user",
  title: "New or Updated User",
  description: "The run gets each newly created or updated user.",
  action: userList,
  input: () => ({ orderBy: "updated_at desc", limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => {
    const user = item as { id?: unknown; updated_at?: unknown };
    return `${user.id ?? ""}:${user.updated_at ?? ""}`;
  },
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user-1", updated_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
