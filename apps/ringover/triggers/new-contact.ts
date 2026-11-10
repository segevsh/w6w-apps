import type { ActionDefinition } from "@w6w/types";
import action from "../actions/contact-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /contacts` (https://developer.ringover.com/web/openapi_public.yml, verified 2026-11-10) documents no created-at order or filter, so
 * there is no newest-first window. The collection is a team's own address book / roster, so each
 * check reads it whole (read in pages of 500 with `limit_count`/`limit_offset`) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description:
    "The run gets each contact that appears in the team, found by diffing the whole `contact-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  pageSize: 500,
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => String((item as { contact_id?: unknown }).contact_id),
  output: [
    {
      "key": "contact_id",
      "type": "number",
      "label": "Contact ID",
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
    "contact_id": 1234,
    "firstname": "Ada",
    "lastname": "Lovelace",
  },
});
