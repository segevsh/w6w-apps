import businessUnitList from "../actions/business-unit-list.ts";
import { snapshotTrigger } from "../lib/record-triggers.ts";

/**
 * Snapshot poll (brief 9.1 c). A tenant's business units are a small configuration list; the whole list is read
 * page by page through `business-unit-list` and only added rows are events.
 */
export default snapshotTrigger({
  key: "new-business-unit",
  title: "New Business Unit",
  description: "The run gets each business unit newly added to the ServiceTitan tenant.",
  action: businessUnitList,
  output: [
    { key: "id", type: "number", label: "Business unit ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "active", type: "boolean", label: "Active" },
  ],
  sample: { id: 11, name: "Plumbing", active: true },
});
