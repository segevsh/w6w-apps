import {
  asArray,
  COMPANY_PARAM,
  dayCount,
  isoDay,
  LOOKBACK_PARAM,
  snapshotTrigger,
  uuidOf,
} from "../lib/triggers.ts";
import timeOffRequestList from "../actions/time-off-request-list.ts";

export default snapshotTrigger({
  key: "new-time-off-request",
  title: "New Time Off Request",
  description: "The run gets each time off request that appears in the watched window.",
  action: timeOffRequestList,
  params: [COMPANY_PARAM, LOOKBACK_PARAM(90)],
  input: (p) => ({
    companyId: p.companyId,
    startDate: isoDay(-dayCount(p.lookbackDays, 90)),
    returnAll: true,
  }),
  items: asArray,
  idOf: uuidOf,
  updated: false,
  output: [
    { key: "uuid", type: "string", label: "Request UUID" },
    { key: "status", type: "string", label: "Status" },
    { key: "request_type", type: "string", label: "Type" },
    { key: "employee_uuid", type: "string", label: "Employee" },
    { key: "days", type: "object", label: "Days and hours" },
  ],
  sample: {
    uuid: "time-off-1",
    status: "pending",
    request_type: "vacation",
    employee_uuid: "employee-1",
    days: { "2026-12-24": "8.000" },
  },
});
