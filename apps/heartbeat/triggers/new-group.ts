import { snapshotTrigger } from "../lib/triggers.ts";
import listGroups from "../actions/list-groups.ts";

/**
 * `GET /v0/groups` returns every group in one unpaged response
 * (https://heartbeat.readme.io/reference/getgroups), one community's own groups (bounded; the kit caps a snapshot at 5000 rows), so each check diffs the
 * ids against the previous one (`pollSnapshot`, added only; membership edits are not events).
 */
export default snapshotTrigger({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created group of the Heartbeat community.",
  action: listGroups,
  field: "groups",
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "color", type: "string", label: "Color" },
    { key: "parentGroupID", type: "string", label: "Parent group ID" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],
  sample: {
    id: "7c1d3e52-6d2a-4c58-8f0e-2a9b6f1d3c44",
    name: "Founding members",
    description: "The first hundred",
    color: "#ff8800",
    parentGroupID: null,
    archived: false,
  },
});
