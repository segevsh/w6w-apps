import { pollFromListAction } from "../../_shared/poll/mod.ts";
import cadenceMembershipList from "../actions/cadence-membership-list.ts";

/**
 * `GET` list with `sort_by=added_at&sort_direction=DESC`: most recently added first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-cadence-membership",
  title: "New Cadence Membership",
  description: "The run gets each person newly added to a cadence.",
  action: cadenceMembershipList,
  input: () => ({ sortBy: "added_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Membership ID" },
    { key: "added_at", type: "string", label: "Added at" },
    { key: "currently_on_cadence", type: "boolean", label: "Currently on cadence" },
  ],
  sample: { id: 9001, added_at: "2026-11-10T09:00:00Z", currently_on_cadence: true },
  maxPages: 1,
});
