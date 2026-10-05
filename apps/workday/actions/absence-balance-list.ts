import { listAction } from "../lib/actions.ts";

import { dateOnly, idValue } from "../lib/client.ts";

export default listAction({
  key: "absence-balance-list",
  resource: "absence-balance",
  title: "List a worker's absence balances",
  description:
    "The balance of every absence plan and leave type for one worker, optionally as of a date or for a " +
    "category. Absence Management v5 `GET /balances`; `worker` is required by Workday.",
  service: "absenceManagement",
  path: "/balances",
  params: [
    {
      key: "workerId",
      label: "Worker ID",
      type: "string",
      required: true,
      hint: "A 32-character Workday ID. Take the `id` from a Workers list.",
    },
    {
      key: "effective",
      label: "As of date",
      type: "string",
      placeholder: "2026-10-01",
      hint: "yyyy-mm-dd. Balances as of this date.",
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint: "Workday ID of the time off, leave type or absence table category.",
    },
  ],
  query: (i) => ({
    worker: idValue(i.workerId, "workerId"),
    effective: dateOnly(i.effective, "effective"),
    category: i.category as string,
  }),
});
