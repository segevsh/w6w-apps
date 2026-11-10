import technicianList from "../actions/technician-list.ts";
import { snapshotTrigger } from "../lib/record-triggers.ts";

/**
 * Snapshot poll (brief 9.1 c). A tenant's technicians are a small configuration list; the whole list is read
 * page by page through `technician-list` and only added rows are events.
 */
export default snapshotTrigger({
  key: "new-technician",
  title: "New Technician",
  description: "The run gets each technician newly added to the ServiceTitan tenant.",
  action: technicianList,
  output: [
    { key: "id", type: "number", label: "Technician ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "businessUnitId", type: "number", label: "Business unit ID" },
  ],
  sample: { id: 401, name: "Alan Turing", businessUnitId: 11 },
});
