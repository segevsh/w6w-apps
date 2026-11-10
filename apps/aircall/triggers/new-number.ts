import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/number-list.ts";

// Numbers list: `order=desc` sorts by creation date, newest first
// (https://developer.aircall.io/api-references/ "List all Numbers", verified 2026-11-10).
export default pollFromListAction({
  key: "new-number",
  title: "New Number",
  description: "The run gets each newly added Aircall phone Number.",
  action,
  input: () => ({ order: "desc", page: 1, perPage: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Number ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "digits", type: "string", label: "Phone number" },
    { key: "country", type: "string", label: "Country" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 1234,
    name: "Support line",
    digits: "+1 800 123 1234",
    country: "US",
    created_at: "2026-11-01T10:00:00Z",
  },
  maxPages: 1,
});
