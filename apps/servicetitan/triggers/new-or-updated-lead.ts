import leadList from "../actions/lead-list.ts";
import { sinceTrigger } from "../lib/record-triggers.ts";

/**
 * Since-filter poll (brief 9.1 b, second trigger 9.2) over `lead-list`: ServiceTitan lists leads with `modifiedOnOrAfter`
 * (https://developer.servicetitan.io/apis/ -- the action's own filter; see the README note).
 */
export default sinceTrigger({
  key: "new-or-updated-lead",
  title: "New or Updated Lead",
  description:
    "The run gets each lead that is created or modified in ServiceTitan (each new `modifiedOn` is a new event).",
  action: leadList,
  mode: "updated",
  filter: "modifiedOnOrAfter",
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
    modifiedOn: "2026-11-09T12:00:00Z",
  },
});
