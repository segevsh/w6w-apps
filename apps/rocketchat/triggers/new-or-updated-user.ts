import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listUsers from "../actions/list-users.ts";

export default pollFromListAction({
  key: "new-or-updated-user",
  title: "New or Updated User",
  description: "The run gets each newly created or updated workspace user.",
  action: listUsers,
  input: () => ({ count: 100, offset: 0, sort: '{"_updatedAt":-1}' }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => {
    const user = item as { _id?: unknown; _updatedAt?: unknown };
    return `${user._id ?? ""}:${user._updatedAt ?? ""}`;
  },
  output: [{ key: "_id", type: "string", label: "User ID" }],
  sample: { _id: "user-1", _updatedAt: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
