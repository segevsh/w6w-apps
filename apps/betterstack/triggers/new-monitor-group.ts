import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import monitorGroupList from "../actions/monitor-group-list.ts";

export default snapshotList({
  key: "new-monitor-group",
  title: "New Monitor Group",
  description: "The run gets each newly created monitor group.",
  action: monitorGroupList,
  input: (_params, page) => ({ page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "paused", type: "boolean", label: "Paused" },
  ],
  sample: { id: "3001", type: "monitor_group", name: "Backend services", paused: false },
});
