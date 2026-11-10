import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import searchDeals from "../actions/search-deals.ts";
import { idOf, records } from "../lib/triggers.ts";

// GET /deals has no sort argument; Follow Up Boss returns every collection in reverse `id` order
// by default ("Resources are returned in reverse order by id by default"):
// https://docs.followupboss.com/reference/pagination (verified 2026-11-10).
export default pollFromListAction<Record<string, unknown>>({
  key: "new-deal",
  title: "New Deal",
  description: "The run gets each newly created deal (transaction) in Follow Up Boss.",
  action: searchDeals as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stageId", type: "number", label: "Stage ID" },
    { key: "pipelineId", type: "number", label: "Pipeline ID" },
    { key: "price", type: "number", label: "Price" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: 55,
    name: "12 Main St",
    stageId: 3,
    pipelineId: 1,
    price: 450000,
    status: "Active",
  },
  maxPages: 1,
});
