import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import directoryUserList from "../actions/directory-user-list.ts";

// WorkOS: GET /directory_users
// `order=desc` is "ordered by the creation time", newest first (https://workos.com/docs/reference/directory-sync/directory-user/list, verified 2026-11-10).
// Newest-first, brief 9.1 a.
export default pollFromListAction<{ directoryId: string }>({
  key: "new-directory-user",
  title: "New Directory User",
  description: "The run gets each user newly provisioned into the chosen directory.",
  action: directoryUserList as unknown as ActionDefinition,
  input: ({ directoryId }) => ({ directoryId, order: "desc", limit: 50 }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "directoryId", label: "Directory ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Directory user ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "state", type: "string", label: "State" },
    { key: "directory_id", type: "string", label: "Directory ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "directory_user_01SAMPLE",
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    state: "active",
    directory_id: "directory_01SAMPLE",
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
