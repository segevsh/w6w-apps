import { listAction } from "../lib/actions.ts";

import { dateOnly, list } from "../lib/client.ts";

export default listAction({
  key: "leave-of-absence-list",
  resource: "leave-of-absence",
  title: "List a worker's leaves of absence",
  description:
    "Leaves of absence for a worker, optionally within a date range or filtered by status and leave type. " +
    "Absence Management v5 `GET /workers/{ID}/leavesOfAbsence`.",
  service: "absenceManagement",
  path: "/workers/{ID}/leavesOfAbsence",
  idKey: "workerId",
  idLabel: "Worker ID",
  params: [
    {
      key: "fromDate",
      label: "From date",
      type: "string",
      placeholder: "2026-01-01",
      hint: "yyyy-mm-dd.",
    },
    {
      key: "toDate",
      label: "To date",
      type: "string",
      placeholder: "2026-12-31",
      hint: "yyyy-mm-dd.",
    },
    { key: "status", label: "Status IDs", type: "string", hint: "Workday IDs, comma separated." },
    {
      key: "leaveType",
      label: "Leave type IDs",
      type: "string",
      hint: "Workday IDs, comma separated.",
    },
  ],
  query: (i) => ({
    fromDate: dateOnly(i.fromDate, "fromDate"),
    toDate: dateOnly(i.toDate, "toDate"),
    status: list(i.status),
    leaveType: list(i.leaveType),
  }),
});
