import { pollFromListAction } from "../../_shared/poll/mod.ts";
import letterList from "../actions/letter-list.ts";

// Lob documents this list as "sorted by creation date, with the most recently created appearing
// first" (https://docs.lob.com/); the sort is also sent explicitly where the action takes one.
export default pollFromListAction({
  key: "new-letter",
  title: "New Letter",
  description: "The run gets each newly created letter.",
  action: letterList,
  input: () => ({ limit: 100, sortBy: "date_created:desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Letter ID" },
    { key: "date_created", type: "string", label: "Created at" },
  ],
  sample: { id: "ltr_123", date_created: "2026-11-10T09:00:00.000Z" },
  maxPages: 1,
});
