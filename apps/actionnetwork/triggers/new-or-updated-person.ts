import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/person-list.ts";

export default pollFromListAction({
  key: "new-or-updated-person",
  title: "New or Updated Person",
  description: "The run gets each newly created or updated person.",
  action,
  input: () => ({ filter: "modified_date gt '1970-01-01'", page: 1, perPage: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const person = item as { id?: unknown; identifiers?: unknown[]; modified_date?: unknown };
    return `${person.id ?? person.identifiers?.[0] ?? ""}:${person.modified_date ?? ""}`;
  },
  output: [{ key: "identifiers", type: "array", label: "Person identifiers" }],
  sample: { identifiers: ["action_network:person-101"], modified_date: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
