import { pollFromListAction } from "../../_shared/poll/mod.ts";
import cadenceMembershipList from "../actions/cadence-membership-list.ts";

/**
 * `GET` list with `sort_by=updated_at&sort_direction=DESC`: most recently updated first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-or-updated-cadence-membership",
  title: "New or Updated Cadence Membership",
  description:
    "The run gets each cadence membership when it is created or changes (for example the person finishes or leaves).",
  action: cadenceMembershipList,
  input: () => ({ sortBy: "updated_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { updated_at?: unknown }).updated_at ?? ""}`,
  output: [
    { key: "id", type: "number", label: "Membership ID" },
    { key: "updated_at", type: "string", label: "Updated at" },
    { key: "currently_on_cadence", type: "boolean", label: "Currently on cadence" },
  ],
  sample: { id: 9001, updated_at: "2026-11-10T09:00:00Z", currently_on_cadence: false },
  maxPages: 1,
});
