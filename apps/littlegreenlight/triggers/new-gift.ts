import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import giftSearch from "../actions/gift-search.ts";

/** LGL requires one `q[]` clause on a search; `updated_from=2000-01-01` matches every gift. */
export default pollFromListAction({
  key: "new-gift",
  title: "New Gift",
  description: "The run gets each newly recorded gift, across every constituent.",
  action: giftSearch as unknown as ActionDefinition,
  input: () => ({
    filters: ["updated_from=2000-01-01"],
    sort: "date_created",
    sortDescending: true,
    limit: 100,
    offset: 0,
  }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Gift ID" },
    { key: "constituent_id", type: "number", label: "Constituent ID" },
    { key: "received_amount", type: "number", label: "Amount" },
    { key: "received_date", type: "string", label: "Received date" },
  ],
  sample: {
    id: 9001,
    constituent_id: 1001,
    received_amount: 250,
    received_date: "2026-11-09",
  },
  maxPages: 1,
});
