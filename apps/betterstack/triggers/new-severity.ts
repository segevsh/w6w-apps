import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import severityList from "../actions/severity-list.ts";

export default snapshotList({
  key: "new-severity",
  title: "New Severity",
  description: "The run gets each newly created severity (urgency).",
  action: severityList,
  input: (_params, page) => ({ page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Severity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "call", type: "boolean", label: "Calls the on-call person" },
  ],
  sample: { id: "5001", type: "urgency", name: "High Severity", call: true },
});
