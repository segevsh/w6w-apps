import userList from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/users` through `user-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Vanta account.",
  action: userList,
  listKey: "users",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "displayName", type: "string", label: "Display name" },
  ],
  sample: { id: "user-1", email: "alex@example.com", displayName: "Alex Doe" },
});
