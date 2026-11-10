import appointmentList from "../actions/appointment-list.ts";
import { sinceTrigger } from "../lib/record-triggers.ts";

/**
 * Since-filter poll (brief 9.1 b, second trigger 9.2) over `appointment-list`: ServiceTitan lists appointments with `modifiedOnOrAfter`
 * (https://developer.servicetitan.io/apis/ -- the action's own filter; see the README note).
 */
export default sinceTrigger({
  key: "new-or-updated-appointment",
  title: "New or Updated Appointment",
  description:
    "The run gets each appointment that is created or modified in ServiceTitan (each new `modifiedOn` is a new event).",
  action: appointmentList,
  mode: "updated",
  filter: "modifiedOnOrAfter",
  output: [
    { key: "id", type: "number", label: "Appointment ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "start", type: "string", label: "Start" },
    { key: "createdOn", type: "string", label: "Created on" },
    { key: "modifiedOn", type: "string", label: "Modified on" },
  ],
  sample: {
    id: 7001,
    jobId: 5001,
    status: "Scheduled",
    start: "2026-11-10T09:00:00Z",
    createdOn: "2026-11-09T09:00:00Z",
    modifiedOn: "2026-11-09T12:00:00Z",
  },
});
