import type { ActionDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { idField, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /users` documents only `include_deactivated`; the organization's agents fit one response. */
export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly added support agent (user) of the organization.",
  action: userList as unknown as ActionDefinition,
  paged: false,
  input: () => ({}),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role_id", type: "string", label: "Role ID" },
  ],
  sample: { id: "usr_1", name: "Sam Agent", email: "sam@example.com", role_id: "role_1" },
});
