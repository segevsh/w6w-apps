import { listAction } from "../lib/actions.ts";

import { dateOnly } from "../lib/client.ts";

export default listAction({
  key: "time-total-list",
  resource: "time-tracking",
  title: "Get a worker's reported hours",
  description:
    "A summary of reported hours for a worker over the period containing `periodDate` (today by default). " +
    "Time Tracking v7 `GET /workers/{ID}/timeTotals`; secured by Process: Time Block REST APIs / Time Clock.",
  service: "timeTracking",
  path: "/workers/{ID}/timeTotals",
  idKey: "workerId",
  idLabel: "Worker ID",
  params: [
    {
      key: "periodDate",
      label: "Period date",
      type: "string",
      placeholder: "2026-10-01",
      hint: "yyyy-mm-dd. Picks the period that contains this date.",
    },
  ],
  query: (i) => ({ periodDate: dateOnly(i.periodDate, "periodDate") }),
});
