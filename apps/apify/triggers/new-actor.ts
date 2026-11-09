import { pollFromListAction } from "../../_shared/poll/mod.ts";
import actorList from "../actions/actor-list.ts";

export default pollFromListAction({
  key: "new-actor",
  title: "New Actor",
  description: "The run gets each newly created Actor.",
  action: actorList,
  input: () => ({ sortBy: "createdAt", desc: true, limit: 100, offset: 0 }),
  items: (result) => {
    const items = (result as { items?: unknown[] }).items;
    return Array.isArray(items) ? items : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Actor ID" },
    { key: "name", type: "string", label: "Actor name" },
  ],
  sample: { id: "actor-new", name: "New actor" },
  maxPages: 1,
});
