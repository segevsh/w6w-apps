import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each newly created user, oldest first, polled from the existing `user-list` action sorted by `created` descending (`sort=-created`).",
  action,
  input: () => ({ sort: "-created", limit: 100, returnAll: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { _id?: unknown })._id),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "username", type: "string", label: "Username" },
    { key: "created", type: "string", label: "Created at" },
  ],
  sample: {
    _id: "5f0a1b2c3d4e5f6a7b8c9d0e",
    email: "ada@example.com",
    username: "ada",
    created: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
