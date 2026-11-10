import { pollFromListAction } from "../../_shared/poll/mod.ts";
import cadenceList from "../actions/cadence-list.ts";

/**
 * `GET` list with `sort_by=updated_at&sort_direction=DESC`: most recently updated first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-or-updated-cadence",
  title: "New or Updated Cadence",
  description: "The run gets each cadence when it is created or updated.",
  action: cadenceList,
  input: () => ({ sortBy: "updated_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { updated_at?: unknown }).updated_at ?? ""}`,
  output: [
    { key: "id", type: "number", label: "Cadence ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: { id: 71, name: "Outbound Q4", updated_at: "2026-11-10T09:00:00Z" },
  maxPages: 1,
});
