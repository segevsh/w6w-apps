import { snapshotTrigger } from "../lib/snapshot.ts";
import userList from "../actions/user-list.ts";

export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Capsule account.",
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 7, username: "sample.user", name: "Sample User" },
  async load(_params, _page, ctx) {
    const res = await userList.execute({}, ctx) as { users?: Array<Record<string, unknown>> };
    return { rows: res.users ?? [] };
  },
});
