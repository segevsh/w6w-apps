import { snapshotTrigger } from "../lib/triggers.ts";
import userList from "../actions/user-list.ts";

export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the FreeAgent account.",
  action: userList,
  itemsKey: "users",
  output: [
    { key: "url", type: "string", label: "User URL (its ID)" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/users/1",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.test",
    role: "Director",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
});
