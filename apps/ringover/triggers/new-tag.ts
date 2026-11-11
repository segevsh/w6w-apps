import type { ActionDefinition } from "@w6w/types";
import action from "../actions/tag-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /tags` (https://developer.ringover.com/web/openapi_public.yml, verified 2026-11-10) documents no created-at order or filter, so
 * there is no newest-first window. The collection is a team's own address book / roster, so each
 * check reads it whole (a single, unpaged request) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-tag",
  title: "New Tag",
  description:
    "The run gets each call tag that appears in the team, found by diffing the whole `tag-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  items: (result) => (result as { tags?: unknown[] }).tags ?? [],
  idOf: (item) => String((item as { tag_id?: unknown }).tag_id),
  output: [
    {
      "key": "tag_id",
      "type": "number",
      "label": "Tag ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Name",
    },
  ],
  sample: {
    "tag_id": 1,
    "name": "follow-up",
  },
});
