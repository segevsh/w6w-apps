import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { contactBody, contactFields } from "../lib/params.ts";

/**
 * `POST /v2/public/contact` — create a new contact/lead.
 *
 * The vendor's own Contact Management guide is explicit: **"Search then
 * Create"** — kvCORE allows duplicate contacts, so an integration should
 * check `contact-list` (by email/phone/name) before calling this. Left to the
 * caller rather than enforced here, because a workflow may legitimately want
 * duplicates suppressed differently per source.
 *
 * Three distinct assignment modes, all documented in the guide and all just
 * different combinations of the same two fields:
 *  - Omit `assigned_agent_id` entirely to route the lead through the
 *    account's lead-matching rules.
 *  - Set `assigned_agent_id` to assign a specific agent directly.
 *  - Add `entity_owner_id` to route through a specific entity's (company,
 *    team, office) rules while keeping the record owned by that entity.
 */
const contactCreate: ActionDefinition<Record<string, unknown>> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a new kvCORE contact/lead. Search first — kvCORE permits duplicate contacts and does " +
    "not de-duplicate for you.",
  idempotent: false,
  params: contactFields({ create: true }),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json("/contact", {
      method: "POST",
      body: contactBody(input),
    });
  },
};

export default contactCreate;
