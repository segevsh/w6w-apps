import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postcardList from "../actions/postcard-list.ts";

// Lob documents this list as "sorted by creation date, with the most recently created appearing
// first" (https://docs.lob.com/); the sort is also sent explicitly where the action takes one.
export default pollFromListAction({
  key: "new-postcard",
  title: "New Postcard",
  description: "The run gets each newly created postcard.",
  action: postcardList,
  input: () => ({ limit: 100, sortBy: "date_created:desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Postcard ID" },
    { key: "date_created", type: "string", label: "Created at" },
  ],
  sample: { id: "psc_123", date_created: "2026-11-10T09:00:00.000Z" },
  maxPages: 1,
});
