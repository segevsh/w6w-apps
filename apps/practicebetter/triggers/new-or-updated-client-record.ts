import listClientRecords from "../actions/list-client-records.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `modified_gte` filters `GET /consultant/records` on `dateModified`; page size is capped at 100. */
export default sinceTrigger({
  key: "new-or-updated-client-record",
  title: "New or Updated Client Record",
  description: "The run gets each client record when it is created or modified.",
  action: listClientRecords,
  pageSize: 100,
  input: ({ since }) => ({ modified_gte: since, limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  nextPageInput: (input, result) =>
    (result as { hasMore?: boolean }).hasMore
      ? { ...input, skip: Number(input.skip ?? 0) + 100 }
      : undefined,
  idOf: (item) => {
    const r = item as { id?: unknown; dateModified?: unknown };
    return `${r.id ?? ""}:${r.dateModified ?? ""}`;
  },
  stampOf: (item) => (item as { dateModified?: unknown }).dateModified,
  output: [
    { key: "id", type: "string", label: "Client record ID" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateModified", type: "string", label: "Last modified at" },
    { key: "isActive", type: "boolean", label: "Active" },
  ],
  sample: {
    id: "rec-1",
    dateCreated: "2026-11-10T09:00:00Z",
    dateModified: "2026-11-10T09:30:00Z",
    isActive: true,
  },
});
