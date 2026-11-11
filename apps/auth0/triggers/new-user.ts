import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";
import { rowsOf, str } from "../lib/triggers.ts";

// GET /api/v2/users?sort=created_at%3A-1&page=0&per_page=100 — "List or Search Users": "sort: Field
// to sort by. Use field:order where order is 1 for ascending and -1 for descending, e.g.
// created_at:1" (https://auth0.com/docs/api/management/v2/users/get-users). The index is
// eventually consistent, so a user may show up a little after creation; it is still new when it does.
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly created in the Auth0 tenant.",
  action: userList,
  input: () => ({ query: "", sort: "created_at:-1", limit: 100 }),
  items: rowsOf("users"),
  idOf: (item) => str((item as { user_id?: unknown }).user_id),
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    user_id: "auth0|65f1c2d3e4f5a6b7c8d9e0f1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
