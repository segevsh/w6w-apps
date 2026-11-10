import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import heartbeatList from "../actions/heartbeat-list.ts";

export default snapshotList({
  key: "new-heartbeat",
  title: "New Heartbeat",
  description: "The run gets each newly created heartbeat.",
  action: heartbeatList,
  input: (_params, page) => ({ page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Heartbeat ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "url", type: "string", label: "Ping URL" },
  ],
  sample: {
    id: "2001",
    type: "heartbeat",
    name: "Nightly backup",
    status: "up",
    url: "https://uptime.betterstack.com/api/v1/heartbeat/sample-token",
  },
});
