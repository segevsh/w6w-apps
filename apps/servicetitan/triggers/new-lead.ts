import leadList from "../actions/lead-list.ts";
import { sinceTrigger } from "../lib/record-triggers.ts";

/**
 * Since-filter poll (brief 9.1 b) over `lead-list`: ServiceTitan lists leads with `createdOnOrAfter`
 * (https://developer.servicetitan.io/apis/ -- the action's own filter; see the README note).
 */
export default sinceTrigger({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each lead newly created in ServiceTitan.",
  action: leadList,
  mode: "new",
  filter: "createdOnOrAfter",
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "customerId", type: "number", label: "Customer ID" },
    { key: "createdOn", type: "string", label: "Created on" },
    { key: "modifiedOn", type: "string", label: "Modified on" },
  ],
  sample: {
    id: 6001,
    status: "Open",
    customerId: 101,
    createdOn: "2026-11-09T09:00:00Z",
    modifiedOn: "2026-11-09T09:00:00Z",
  },
});
