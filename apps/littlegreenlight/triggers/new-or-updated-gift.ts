import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import giftSearch from "../actions/gift-search.ts";

/** LGL requires one `q[]` clause on a search; `updated_from=2000-01-01` matches every gift. */
export default pollFromListAction({
  key: "new-or-updated-gift",
  title: "New or Updated Gift",
  description: "The run gets each gift that is newly recorded or was edited.",
  action: giftSearch as unknown as ActionDefinition,
  input: () => ({
    filters: ["updated_from=2000-01-01"],
    sort: "date_updated",
    sortDescending: true,
    limit: 100,
    offset: 0,
  }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const g = item as { id?: unknown; updated_at?: unknown };
    return `${String(g.id ?? "")}:${String(g.updated_at ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Gift ID" },
    { key: "received_amount", type: "number", label: "Amount" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: { id: 9001, received_amount: 250, updated_at: "2026-11-10T09:00:00Z" },
  maxPages: 1,
});
