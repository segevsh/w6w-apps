import type { ActionDefinition } from "@w6w/types";
import action from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /users` (https://developer.ringover.com/web/openapi_public.yml, verified 2026-11-10) documents no created-at order or filter, so
 * there is no newest-first window. The collection is a team's own address book / roster, so each
 * check reads it whole (a single, unpaged request) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each team user that appears in the team, found by diffing the whole `user-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { user_id?: unknown }).user_id),
  output: [
    {
      "key": "user_id",
      "type": "number",
      "label": "User ID",
    },
    {
      "key": "firstname",
      "type": "string",
      "label": "First name",
    },
    {
      "key": "lastname",
      "type": "string",
      "label": "Last name",
    },
  ],
  sample: {
    "user_id": 3,
    "firstname": "Ada",
    "lastname": "Lovelace",
  },
});
