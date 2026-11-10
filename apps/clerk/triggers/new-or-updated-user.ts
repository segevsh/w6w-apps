import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-or-updated-user",
  title: "New or Updated User",
  description:
    "The run gets each Clerk user that is created or changed (ordered by updated_at, newest first).",
  action: userList,
  input: () => ({ orderBy: "-updated_at", limit: 100, offset: 0 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (v) => {
    const u = v as { id?: unknown; updated_at?: unknown };
    return `${u.id}:${u.updated_at}`;
  },
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
    { key: "updated_at", type: "number", label: "Updated at (Unix ms)" },
  ],
  sample: {
    id: "user_2abc123",
    first_name: "Ada",
    last_name: "Lovelace",
    created_at: 1794128400000,
    updated_at: 1794132000000,
  },
  maxPages: 1,
});
