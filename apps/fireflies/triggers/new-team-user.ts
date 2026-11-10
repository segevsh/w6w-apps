import type { ActionDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** The `users` query takes no arguments and returns everyone on the caller's team, so each check
 * diffs `user_id`. https://docs.fireflies.ai/graphql-api/query/users */
export default snapshotTrigger({
  key: "new-team-user",
  title: "New Team User",
  description: "The run gets each user newly added to the Fireflies team.",
  action: userList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  keyOf: (item) => String((item as { user_id?: unknown }).user_id ?? ""),
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_admin", type: "boolean", label: "Team admin" },
  ],
  sample: { user_id: "user-1", email: "ada@example.com", name: "Ada", is_admin: false },
});
