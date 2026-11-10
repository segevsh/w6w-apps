import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import constituentSearch from "../actions/constituent-search.ts";

export default pollFromListAction({
  key: "new-or-updated-constituent",
  title: "New or Updated Constituent",
  description: "The run gets each new or updated constituent.",
  action: constituentSearch as unknown as ActionDefinition,
  input: (_params) => ({
    filters: [],
    sort: "date_updated",
    sortDescending: true,
    limit: 100,
    offset: 0,
  }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String((item as { id?: unknown; updated_at?: unknown }).id ?? "") + ":" +
    String((item as { updated_at?: unknown }).updated_at ?? ""),

  output: [
    { key: "id", type: "string", label: "Constituent ID" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: { id: "example-1", updated_at: "2026-11-09T10:00:00Z" },
  maxPages: 1,
});
