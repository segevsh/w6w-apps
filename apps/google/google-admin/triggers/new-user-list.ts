import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user-list",
  title: "New User",
  description: "The run gets each newly created Workspace user.",
  action: userList,
  input: () => ({
    customer: "my_customer",
    maxResults: 100,
    orderBy: "creationTime",
    sortOrder: "DESCENDING",
  }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "123456789" },
  maxPages: 1,
});
