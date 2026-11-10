import type { ActionDefinition } from "@w6w/types";
import enterpriseUsersList from "../actions/enterprise-users-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v3/enterprise/users` (team admin token) returns every user in one response; each check
 * diffs the user ids. https://developers.feedly.com/llms.txt (List Enterprise Users) */
export default snapshotTrigger({
  key: "new-enterprise-user",
  title: "New Team User",
  description: "The run gets each user newly added to the Feedly enterprise account.",
  action: enterpriseUsersList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  keyOf: (item) => {
    const u = item as { id?: unknown; email?: unknown };
    return String(u.id ?? u.email ?? "");
  },
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
  ],
  sample: { id: "user-1", email: "analyst@example.com", role: "member" },
});
