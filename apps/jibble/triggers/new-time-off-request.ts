import type { ActionDefinition } from "@w6w/types";
import { odataSnapshot } from "../lib/triggers.ts";
import timeOffList from "../actions/time-off-list.ts";

/**
 * `GET /v1/TimeOffOverview` has no created/updated stamp and no sort that follows submission
 * time ($metadata: id, policyId, personId, kind, partOfDay, startDate, endDate, startTime,
 * endTime, status, note, holidays, approvals, duration). So the trigger reads the bounded set of
 * requests that have not ended yet (`$filter=endDate ge <today, UTC>`) and diffs it against the
 * last check; a request for a day already past is not seen.
 */
export default odataSnapshot({
  key: "new-time-off-request",
  title: "New Time Off Request",
  description:
    "The run gets each new time-off request for a current or upcoming day: person, policy, dates and status.",
  action: timeOffList as ActionDefinition,
  filter: () => `endDate ge ${new Date().toISOString().slice(0, 10)}`,
  output: [
    { key: "id", type: "string", label: "Request ID" },
    { key: "personId", type: "string", label: "Person ID" },
    { key: "policyId", type: "string", label: "Time-off policy ID" },
    { key: "startDate", type: "string", label: "First day" },
    { key: "endDate", type: "string", label: "Last day" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "timeoff-1",
    personId: "person-1",
    policyId: "policy-1",
    startDate: "2026-12-01",
    endDate: "2026-12-03",
    status: "Pending",
  },
});
