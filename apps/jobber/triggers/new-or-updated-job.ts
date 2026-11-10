import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/job-list.ts";

/**
 * Wraps `job-list` sorted `UPDATED_AT` descending (the action offers no `CREATED_AT` sort, so a
 * new job and an edited one both surface here; the id carries the `updatedAt` stamp).
 */
export default pollFromListAction({
  key: "new-or-updated-job",
  title: "New or Updated Job",
  description:
    "The run gets each job that is new or has been edited since the last check, polled from the existing `job-list` action sorted by `UPDATED_AT` descending.",
  action,
  input: () => ({ sortKey: "UPDATED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { jobs?: { nodes?: unknown[] } }).jobs?.nodes ?? [],
  idOf: (item) => `${(item as { id?: unknown }).id}:${(item as { updatedAt?: unknown }).updatedAt}`,
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "jobNumber", type: "number", label: "Job number" },
    { key: "jobStatus", type: "string", label: "Status" },
    { key: "title", type: "string", label: "Title" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL0pvYi8x",
    jobNumber: 12,
    jobStatus: "active",
    title: "Lawn care",
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-09T11:00:00Z",
  },
  maxPages: 1,
});
