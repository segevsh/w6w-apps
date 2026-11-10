import { snapshotList } from "../lib/snapshot.ts";
import userList from "../actions/user-list.ts";

export default snapshotList({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the account.",
  action: userList,
  rows: "users",
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],
  sample: { id: 701, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
});
