import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import monitorList from "../actions/monitor-list.ts";

export default snapshotList({
  key: "new-monitor",
  title: "New Monitor",
  description: "The run gets each newly created monitor.",
  action: monitorList,
  input: (_params, page) => ({ page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Monitor ID" },
    { key: "pronounceable_name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "1001",
    type: "monitor",
    pronounceable_name: "Example",
    url: "https://example.com",
    status: "up",
  },
});
