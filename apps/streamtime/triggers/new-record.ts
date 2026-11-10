import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/search-records.ts";

export default pollFromListAction<{ searchView: string; query: string; sortColumn?: string }>({
  key: "new-record",
  title: "New Record",
  description: "The run gets each newly created record in the selected Streamtime search view.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    searchView: params.searchView,
    query: params.query,
    limit: 100,
    offset: 0,
    sortColumn: params.sortColumn ?? "createdAt",
    sortAscending: false,
  }),
  params: (action.params ?? []).filter((p) =>
    p.key === "searchView" || p.key === "query" || p.key === "sortColumn"
  ),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Record ID" }],
  sample: { id: 101, createdAt: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
