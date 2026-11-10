import { snapshotList } from "../lib/snapshot.ts";
import timeOffList from "../actions/time-off-list.ts";

export default snapshotList<{ hrisProfileId: string }>({
  key: "new-time-off-request",
  title: "New Time-off Request",
  description: "The run gets each new time-off request of the chosen worker.",
  params: [{
    key: "hrisProfileId",
    label: "HRIS Profile ID",
    type: "string",
    required: true,
    default: "",
  }],
  action: timeOffList,
  input: (p) => ({ hrisProfileId: p.hrisProfileId }),
  output: [
    { key: "id", type: "string", label: "Request ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "t1", status: "approved" },
});
