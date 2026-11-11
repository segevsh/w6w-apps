import type { TriggerDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /team/users` (https://developers.everhour.com/api-reference/users/get-all-users.md) lists
 * every team member (removed ones included) in one response; a team is a small bounded set, diffed
 * as a snapshot; only additions emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-user",
  title: "New Team Member",
  description: "The run gets each user newly added to the Everhour team.",
  noun: "users",
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "admin, supervisor, member or member_limited" },
    { key: "status", type: "string", label: "active, invited, pending or removed" },
  ],
  sample: {
    id: 1304,
    name: "John Bender",
    email: "john.bender@example.com",
    role: "member",
    status: "active",
  },
  read: (_params, _page, ctx) => userList.execute({}, ctx),
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

export default trigger;
