import type { ActionDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// Same snapshot as `new-user`; a changed row (e.g. status, name) is an event too (brief 9.2).
export default snapshotTrigger<Record<string, never>>({
  key: "new-or-updated-user",
  title: "New or Updated User",
  description: "The run gets each user that was added or changed.",
  action: userList as unknown as ActionDefinition,
  input: () => ({}),
  updated: true,
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
