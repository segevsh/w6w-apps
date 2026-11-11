import type { ActionDefinition } from "@w6w/types";
import action from "../actions/conversation-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /conversations` (https://developer.ringover.com/web/openapi_public.yml, verified 2026-11-10) documents no created-at order or filter, so
 * there is no newest-first window. The collection is a team's own address book / roster, so each
 * check reads it whole (read in pages of 1000 with `limit_count`/`limit_offset`) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-conversation",
  title: "New Conversation",
  description:
    "The run gets each SMS or chat conversation that appears in the team, found by diffing the whole `conversation-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  pageSize: 1000,
  items: (result) => (result as { conversations?: unknown[] }).conversations ?? [],
  idOf: (item) => String((item as { conversation_id?: unknown }).conversation_id),
  output: [
    {
      "key": "conversation_id",
      "type": "number",
      "label": "Conversation ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Name",
    },
    {
      "key": "type",
      "type": "string",
      "label": "Type",
    },
  ],
  sample: {
    "conversation_id": 222111,
    "name": "Support thread",
    "type": "EXTERNAL",
  },
});
