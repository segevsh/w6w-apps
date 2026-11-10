import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/** `GET /v1/users` with `sort=-created_at` returns the newest records first (the same `sort` the action takes). */
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly added user of the organization.",
  action: userList,
  input: () => ({ sort: "-created_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id) + "",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "full_name", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "usr_1",
    type: "users",
    full_name: "Sam Responder",
    email: "sam@example.com",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
