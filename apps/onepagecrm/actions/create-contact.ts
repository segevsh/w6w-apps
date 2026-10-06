import type { ActionDefinition } from "@w6w/types";
import { OnePageClient } from "../lib/client.ts";
import { CONTACT_FIELD_PARAMS, contactBody } from "../lib/params.ts";

/**
 * `POST /contacts` — create a contact. The vendor requires `last_name` or `company_name`. Not
 * idempotent: OnePageCRM accepts no idempotency key, so a retry makes a duplicate contact.
 */
const createContact: ActionDefinition<Record<string, unknown>> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact. Provide a last name or a company name (at least one is required).",
  idempotent: false,
  params: CONTACT_FIELD_PARAMS,
  output: [{ key: "contact", type: "object", label: "The created contact" }],

  async execute(input, ctx) {
    const body = contactBody(input);
    if (!body.last_name && !body.company_name) {
      throw new Error("OnePageCRM requires a last name or a company name to create a contact");
    }
    return await new OnePageClient(ctx).data("/contacts", { method: "POST", body });
  },
};

export default createContact;
