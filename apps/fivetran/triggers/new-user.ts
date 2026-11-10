import { snapshotTrigger } from "../lib/polls.ts";
import userList from "../actions/user-list.ts";

/** `GET /v1/users` (`user-list`): everyone with access to the Fivetran account. */
const newUser = snapshotTrigger({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each person newly added to the Fivetran account, with their email, role and whether they have logged in.",
  action: userList,
  listKey: "users",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "invited", type: "boolean", label: "Invited" },
    { key: "logged_in_at", type: "string", label: "Last logged in (ISO 8601)" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],
  sample: {
    id: "recast_kinase",
    email: "analyst@example.com",
    given_name: "Alex",
    family_name: "Example",
    role: "Account Reviewer",
    verified: true,
    invited: false,
    active: true,
    logged_in_at: null,
    created_at: "2026-11-09T12:00:00.000000Z",
  },
});

export default newUser;
