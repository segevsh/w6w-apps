import { listAction } from "../lib/actions.ts";

import { dateOnly, list } from "../lib/client.ts";

export default listAction({
  key: "eligible-absence-type-list",
  resource: "absence-type",
  title: "List the absence types a worker is eligible for",
  description:
    "Time off types, absence tables and leave types a worker may request. Step 1 of Workday's request-time-off " +
    "flow: the `id` here is the `timeOff` ID for valid dates and the `timeOffType` ID for the request. " +
    "Absence Management v5 `GET /workers/{ID}/eligibleAbsenceTypes`.",
  service: "absenceManagement",
  path: "/workers/{ID}/eligibleAbsenceTypes",
  idKey: "workerId",
  idLabel: "Worker ID",
  params: [
    {
      key: "category",
      label: "Category IDs",
      type: "string",
      hint: "Workday IDs of absence type categories, comma separated.",
    },
    {
      key: "effective",
      label: "Effective date",
      type: "string",
      placeholder: "2026-10-01",
      hint: "yyyy-mm-dd.",
    },
  ],
  query: (i) => ({ category: list(i.category), effective: dateOnly(i.effective, "effective") }),
});
