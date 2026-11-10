import { snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/user-list.ts";

/**
 * `user-list` (`users` connection, `status: ACTIVATED`, the Jobber-required filter). The query takes
 * no sort argument, so the activated team members are walked and diffed.
 */
export default snapshotFeed({
  key: "new-user",
  title: "New User",
  description: "The run gets each team member newly activated in the Jobber account.",
  action,
  field: "users",
  input: ({ after, first }) => ({ status: "ACTIVATED", first, after }),
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "object", label: "Name (first, last, full)" },
    { key: "email", type: "object", label: "Email (raw, isValid)" },
    { key: "status", type: "string", label: "Status" },
    { key: "isAccountAdmin", type: "boolean", label: "Is account admin" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL1VzZXIvMQ==",
    name: { first: "Sam", last: "Lee", full: "Sam Lee" },
    email: { raw: "sam@example.com", isValid: true },
    status: "ACTIVATED",
    isAccountAdmin: false,
  },
});
