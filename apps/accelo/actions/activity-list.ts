import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "activity-list",
  resource: "activity",
  path: "/activities",
  title: "List Activities",
  description:
    "List activities (notes, calls, meetings, emails). Filter by owner, what they are against, or date; e.g. `against_type(job)`, `date_created_after(1490140800)`.",
  filterHint:
    "e.g. `owner_type(staff)`, `against_type_not(job)`, `date_created_after(1490140800)`.",
});
