import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created Clerk user (ordered by created_at, newest first).",
  action: userList,
  input: () => ({ orderBy: "-created_at", limit: 100, offset: 0 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email_addresses", type: "array", label: "Email addresses" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
  ],
  sample: {
    id: "user_2abc123",
    first_name: "Ada",
    last_name: "Lovelace",
    email_addresses: [{ email_address: "ada@example.com" }],
    created_at: 1794128400000,
  },
  maxPages: 1,
});
