import type { ActionDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { recordSnapshot } from "../lib/triggers.ts";

export default recordSnapshot({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each user newly added (or reactivated) among the company's active AccuLynx users.",
  action: userList as unknown as ActionDefinition,
  input: () => ({}),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user-101", status: "Active" },
});
