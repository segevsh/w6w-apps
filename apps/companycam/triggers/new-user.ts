import type { ActionDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/users` lists the company's users, a small bounded collection (seats), so each check
// snapshots all pages (brief 9.1c).
export default snapshotTrigger<Record<string, never>>({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the company.",
  action: userList as unknown as ActionDefinition,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "1001",
    first_name: "Ada",
    last_name: "Roe",
    email_address: "ada@example.com",
    status: "active",
    created_at: 1762646400,
    updated_at: 1762646400,
  },
});
