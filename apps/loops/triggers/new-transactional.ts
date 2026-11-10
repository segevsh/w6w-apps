import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import transactionalList from "../actions/transactional-list.ts";

export default pollFromListAction({
  key: "new-transactional",
  title: "New Transactional Email",
  description: "The run gets each newly created transactional email.",
  action: transactionalList as ActionDefinition,
  input: (_params) => ({ limit: 100 }),
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),

  output: [{ key: "id", type: "string", label: "New Transactional Email ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
