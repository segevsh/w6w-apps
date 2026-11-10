import type { ActionDefinition } from "@w6w/types";
import userGroupList from "../actions/user-group-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-team-group",
  title: "New Team Group",
  description: "The run gets each new Document360 team-account group.",
  action: userGroupList as unknown as ActionDefinition,
  params: userGroupList.params,
  input: (params) => params,
  output: [{ key: "id", type: "string", label: "Team group ID" }],
  sample: { id: "group-101", title: "Editors" },
});
