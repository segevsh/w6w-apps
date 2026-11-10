import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/user-list.ts";

export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each user newly added to the organization, polled from the existing `user-list` action (the whole collection, diffed by id).",
  action,
  input: () => ({ deleted: false }),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "attributes", type: "object", label: "User attributes (name, email, userType)" },
  ],
  sample: {
    id: "5f0a1b2c3d4e5f6a7b8c9d12",
    type: "user",
    attributes: { name: "Ada Lovelace", email: "ada@example.com", userType: "user" },
  },
});
