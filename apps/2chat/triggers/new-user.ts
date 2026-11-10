import type { ActionDefinition } from "@w6w/types";
import { arrayAt, idField, snapshotTrigger } from "../lib/triggers.ts";
import usersList from "../actions/users-list.ts";

export default snapshotTrigger<Record<string, never>>({
  key: "new-user",
  title: "New Account User",
  description: "The run gets each new active user added to the 2Chat account.",
  action: usersList as unknown as ActionDefinition,
  input: () => ({}),
  pick: (result) => arrayAt(result, "data", "users"),
  idOf: idField("uuid"),
  output: [
    { key: "uuid", type: "string", label: "User UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: {
    uuid: "USR1",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
  },
});
