import userList from "../actions/user-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-user",
  title: "New User",
  action: userList,
  output: [{ key: "id", type: "number", label: "User ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
