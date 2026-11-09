import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/person-list.ts";

export default pollFromListAction({
  key: "new-person",
  title: "New Person",
  description: "The run gets each newly created person.",
  action,
  input: () => ({ filter: "modified_date gt '1970-01-01'", page: 1, perPage: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; identifiers?: unknown[] }).id ??
        (item as { identifiers?: unknown[] }).identifiers?.[0] ?? "",
    ),
  output: [{ key: "identifiers", type: "array", label: "Person identifiers" }],
  sample: { identifiers: ["action_network:person-101"] },
  maxPages: 1,
});
