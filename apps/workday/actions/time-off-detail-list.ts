import { listAction } from "../lib/actions.ts";

import { dateOnly, list } from "../lib/client.ts";

export default listAction({
  key: "time-off-detail-list",
  resource: "time-off",
  title: "List a worker's time off entries",
  description:
    "Time off entries for a worker, optionally within a date range or filtered by status and time off type. " +
    "Absence Management v5 `GET /workers/{ID}/timeOffDetails`.",
  service: "absenceManagement",
  path: "/workers/{ID}/timeOffDetails",
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
    {
      key: "status",
      label: "Status IDs",
      type: "string",
      hint: "Workday IDs of time off statuses, comma separated.",
    },
    {
      key: "timeOffType",
      label: "Time off type IDs",
      type: "string",
      hint: "Workday IDs of time off types, comma separated.",
    },
  ],
  query: (i) => ({
    fromDate: dateOnly(i.fromDate, "fromDate"),
    toDate: dateOnly(i.toDate, "toDate"),
    status: list(i.status),
    timeOffType: list(i.timeOffType),
  }),
});
