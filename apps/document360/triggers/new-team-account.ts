import type { ActionDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-team-account",
  title: "New Team Account",
  description: "The run gets each new Document360 team account.",
  action: userList as unknown as ActionDefinition,
  params: userList.params,
  input: (params) => params,
  output: [{ key: "id", type: "string", label: "Team account ID" }],
  sample: { id: "user-101", email: "editor@example.test" },
});
