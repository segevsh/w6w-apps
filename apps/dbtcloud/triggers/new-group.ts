import { snapshotList } from "../lib/snapshot.ts";
import groupList from "../actions/group-list.ts";

export default snapshotList({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created permission group.",
  action: groupList,
  rows: "groups",
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 501, name: "Analysts" },
});
