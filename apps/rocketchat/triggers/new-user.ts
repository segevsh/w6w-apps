import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listUsers from "../actions/list-users.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created workspace user.",
  action: listUsers,
  input: () => ({ count: 100, offset: 0, sort: '{"createdAt":-1}' }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [{ key: "_id", type: "string", label: "User ID" }],
  sample: { _id: "user-1" },
  maxPages: 1,
});
