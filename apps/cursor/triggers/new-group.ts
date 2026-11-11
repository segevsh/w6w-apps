import type { ActionDefinition } from "@w6w/types";
import groupList from "../actions/group-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /teams/groups` answers with every billing group in one response (Enterprise teams only);
 * the team's group set is small and bounded, so each check diffs the ids. The reserved
 * `unassignedGroup` is not a group a user created and is left out.
 * https://cursor.com/docs/account/teams/admin-api
 */
export default snapshotTrigger({
  key: "new-group",
  title: "New Billing Group",
  description: "The run gets each billing group newly created on the Cursor team (Enterprise).",
  action: groupList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { groups?: unknown[] }).groups ?? [],
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "group_sample1", name: "Platform" },
});
