import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listClientRecords from "../actions/list-client-records.ts";

/** Practice Better returns records "in descending order ... most recent first based on date created". */
export default pollFromListAction({
  key: "new-client-record",
  title: "New Client Record",
  description: "The run gets each newly created client record.",
  action: listClientRecords,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Client record ID" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateModified", type: "string", label: "Last modified at" },
    { key: "isActive", type: "boolean", label: "Active" },
  ],
  sample: {
    id: "rec-1",
    dateCreated: "2026-11-10T09:00:00Z",
    dateModified: "2026-11-10T09:00:00Z",
    isActive: true,
  },
  maxPages: 1,
});
