import type { ActionDefinition } from "@w6w/types";
import action from "../actions/group-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /groups` (https://developer.ringover.com/web/openapi_public.yml, verified 2026-11-10) documents no created-at order or filter, so
 * there is no newest-first window. The collection is a team's own address book / roster, so each
 * check reads it whole (read in pages of 1000 with `limit_count`/`limit_offset`) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-group",
  title: "New Group",
  description:
    "The run gets each call group that appears in the team, found by diffing the whole `group-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  pageSize: 1000,
  items: (result) => (result as { groups?: unknown[] }).groups ?? [],
  idOf: (item) => String((item as { group_id?: unknown }).group_id),
  output: [
    {
      "key": "group_id",
      "type": "number",
      "label": "Group ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Name",
    },
  ],
  sample: {
    "group_id": 2,
    "name": "Support",
  },
});
