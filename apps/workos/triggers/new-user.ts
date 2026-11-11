import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

// WorkOS: GET /user_management/users
// `order=desc` is "ordered by the creation time", newest first (https://workos.com/docs/reference/user-management/user/list, verified 2026-11-10).
// Newest-first, brief 9.1 a.
export default pollFromListAction<{ organizationId?: string }>({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each newly created user (an identity that can sign in), optionally for one organization.",
  action: userList as unknown as ActionDefinition,
  input: ({ organizationId }) => ({ organizationId, order: "desc", limit: 50 }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "organizationId", label: "Organization ID", type: "string" }],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email_verified", type: "boolean", label: "Email verified" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "user_01SAMPLE",
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    email_verified: true,
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
