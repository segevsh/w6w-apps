import { listAction } from "../lib/actions.ts";

import { dateOnly, list } from "../lib/client.ts";

export default listAction({
  key: "valid-time-off-date-list",
  resource: "time-off",
  title: "Validate time off dates",
  description:
    "For each date asked about, whether the worker may take that type of time off and how many units. " +
    "Step 2 of Workday's request-time-off flow. Absence Management v5 `GET /workers/{ID}/validTimeOffDates`.",
  service: "absenceManagement",
  path: "/workers/{ID}/validTimeOffDates",
  idKey: "workerId",
  idLabel: "Worker ID",
  params: [
    {
      key: "dates",
      label: "Dates",
      type: "string",
      required: true,
      placeholder: "2026-11-02, 2026-11-03",
      hint: "yyyy-mm-dd, comma separated. Each becomes its own `date` query parameter.",
    },
    {
      key: "timeOff",
      label: "Time off type ID",
      type: "string",
      hint: "The `id` from an eligible-absence-type list.",
    },
    {
      key: "position",
      label: "Position ID",
      type: "string",
      hint: "Only when the worker holds several positions.",
    },
  ],
  query: (i) => {
    const dates = list(i.dates);
    if (!dates) throw new Error("`dates` is required: at least one yyyy-mm-dd date");
    return {
      date: dates.map((d) => dateOnly(d, "dates") as string),
      timeOff: i.timeOff as string,
      position: i.position as string,
    };
  },
});
