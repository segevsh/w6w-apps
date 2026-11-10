import type { ActionDefinition } from "@w6w/types";
import { cursorSnapshot } from "../lib/triggers.ts";
import userList from "../actions/user-list.ts";

/** `GET /v1/users` has no sort or since filter, so it is read through `nextCursor` and diffed by id (added rows only). */
export default cursorSnapshot({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly added user: id, name, email, role and creation time.",
  action: userList as ActionDefinition,
  listKey: "users",
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 9,
    firstName: "Dana",
    lastName: "Rivera",
    email: "dana@example.com",
    role: "TECHNICIAN",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
});
