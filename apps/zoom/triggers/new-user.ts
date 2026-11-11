import userGetMany from "../actions/user-get-many.ts";
import { snapshotTrigger } from "../lib/lists.ts";

/** `GET /users?status=…`: the account's roster. Needs account-level scopes. */
export default snapshotTrigger<{ status?: string }>({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each user newly on the account's user list (checked on a schedule). Needs account-level scopes. For an instant reaction, use User Created.",
  params: [{
    key: "status",
    label: "Status",
    type: "select",
    default: "active",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending", label: "Pending" },
    ],
  }],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "type", type: "number", label: "Type" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "sample-user-id",
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    type: 1,
    status: "active",
  },
  action: userGetMany,
  input: ({ status }) => ({ status: status?.trim() || "active" }),
  rows: "users",
  idOf: (row) => row.id,
  noun: "users",
});
