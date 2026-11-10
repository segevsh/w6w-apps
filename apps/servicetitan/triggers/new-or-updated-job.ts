import jobList from "../actions/job-list.ts";
import { sinceTrigger } from "../lib/record-triggers.ts";

/**
 * Since-filter poll (brief 9.1 b, second trigger 9.2) over `job-list`: ServiceTitan lists jobs with `modifiedOnOrAfter`
 * (https://developer.servicetitan.io/apis/ -- the action's own filter; see the README note).
 */
export default sinceTrigger({
  key: "new-or-updated-job",
  title: "New or Updated Job",
  description:
    "The run gets each job that is created or modified in ServiceTitan (each new `modifiedOn` is a new event).",
  action: jobList,
  mode: "updated",
  filter: "modifiedOnOrAfter",
  output: [
    { key: "id", type: "number", label: "Job ID" },
    { key: "jobNumber", type: "string", label: "Job number" },
    { key: "customerId", type: "number", label: "Customer ID" },
    { key: "locationId", type: "number", label: "Location ID" },
    { key: "jobStatus", type: "string", label: "Status" },
    { key: "createdOn", type: "string", label: "Created on" },
    { key: "modifiedOn", type: "string", label: "Modified on" },
  ],
  sample: {
    id: 5001,
    jobNumber: "5001",
    customerId: 101,
    locationId: 201,
    jobStatus: "Scheduled",
    createdOn: "2026-11-09T09:00:00Z",
    modifiedOn: "2026-11-09T12:00:00Z",
  },
});
