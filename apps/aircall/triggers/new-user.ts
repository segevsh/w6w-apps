import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

// Users list (v2): `order=desc` sorts by creation date, newest first
// (https://developer.aircall.io/api-references/ "List all Users V2", verified 2026-11-10).
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created Aircall User.",
  action,
  input: () => ({ order: "desc", page: 1, perPage: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 456,
    name: "Alex Doe",
    email: "alex@example.com",
    created_at: "2026-11-01T10:00:00Z",
  },
  maxPages: 1,
});
