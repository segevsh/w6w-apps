import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/collection-list.ts";

export default pollFromListAction({
  key: "new-collection",
  title: "New Collection",
  description: "The run gets each newly created collection.",
  action: action as never,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [{ key: "_id", type: "string", label: "Collection ID" }],
  sample: { _id: 42, title: "Reading" },
  maxPages: 1,
});
