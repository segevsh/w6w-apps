import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/visit-list.ts";

/** Wraps `visit-list` sorted `CREATED_AT` descending (the `VisitsSortInput` key the action offers). */
export default pollFromListAction({
  key: "new-visit",
  title: "New Visit",
  description:
    "The run gets each newly created visit, polled from the existing `visit-list` action sorted by `CREATED_AT` descending.",
  action,
  input: () => ({ sortKey: "CREATED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { visits?: { nodes?: unknown[] } }).visits?.nodes ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Visit ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "visitStatus", type: "string", label: "Status" },
    { key: "startAt", type: "string", label: "Starts at" },
    { key: "endAt", type: "string", label: "Ends at" },
    { key: "job", type: "object", label: "Job (id, jobNumber)" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL1Zpc2l0LzE=",
    title: "Lawn care",
    visitStatus: "upcoming",
    startAt: "2026-11-12T09:00:00Z",
    endAt: "2026-11-12T10:00:00Z",
    job: { id: "Z2lkOi8vSm9iYmVyL0pvYi8x", jobNumber: 12 },
  },
  maxPages: 1,
});
