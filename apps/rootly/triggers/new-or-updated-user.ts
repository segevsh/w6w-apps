import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/** `GET /v1/users` with `sort=-updated_at` returns the newest records first (the same `sort` the action takes). */
export default pollFromListAction({
  key: "new-or-updated-user",
  title: "New or Updated User",
  description: "The run gets each user when it is added or changed.",
  action: userList,
  input: () => ({ sort: "-updated_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String((item as { id: string }).id) + ":" +
    String((item as { updated_at?: unknown }).updated_at ?? ""),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "full_name", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "usr_1",
    type: "users",
    full_name: "Sam Responder",
    email: "sam@example.com",
    updated_at: "2026-11-10T09:30:00Z",
  },
  maxPages: 1,
});
