import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import constituentSearch from "../actions/constituent-search.ts";

export default pollFromListAction({
  key: "new-constituent",
  title: "New Constituent",
  description: "The run gets each newly created constituent.",
  action: constituentSearch as unknown as ActionDefinition,
  input: (_params) => ({
    filters: [],
    sort: "date_created",
    sortDescending: true,
    limit: 100,
    offset: 0,
  }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),

  output: [{ key: "id", type: "string", label: "New Constituent ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
