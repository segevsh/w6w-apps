import { snapshotList } from "../lib/snapshot.ts";
import listExclusionLists from "../actions/list-exclusion-lists.ts";

export default snapshotList({
  key: "new-exclusion-list",
  title: "New Exclusion List",
  description: "The run gets each newly created Intellimatch exclusion list.",
  action: listExclusionLists,
  rows: (res) => Array.isArray(res.lists) ? res.lists : [],
  output: [
    { key: "id", type: "number", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_shared", type: "boolean", label: "Shared with the team" },
    { key: "owner_name", type: "string", label: "Owner" },
  ],
  sample: { id: 1, name: "Competitors", is_shared: true, is_owner: true, owner_name: "John Doe" },
});
