import type { ActionDefinition } from "@w6w/types";
import { compact, MailjetClient, type MailjetEnvelope } from "../lib/client.ts";
import type { MailjetContact } from "./list-contacts.ts";

interface Input {
  contact: string;
  name?: string;
  isExcludedFromCampaigns?: boolean;
}

/**
 * Update a contact's name or campaign-exclusion flag.
 *
 * Two Mailjet-specific things shape this action:
 *
 *   1. **`PUT` behaves like `PATCH`.** Mailjet says so explicitly in its API
 *      overview: "In the Mailjet API, all PUT requests behave like PATCH
 *      requests. The update will affect only the specified properties." So
 *      omitted fields are preserved, not cleared, and `compact()` dropping
 *      `undefined` is safe rather than lossy — the opposite of the usual REST
 *      assumption, where a partial PUT wipes what it omits.
 *   2. **The email cannot be changed.** It is the contact's identity. To move an
 *      address you create a new contact and re-subscribe it.
 *
 * Custom contact properties are a separate resource (`/contactdata`) and are not
 * implemented here — see README.md "Not built".
 */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  /** Sets named fields to fixed values — Mailjet's PUT is a PATCH, so a retry lands on the same state. */
  idempotent: true,
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact's name or exclusion flag (PUT /v3/REST/contact/{id_or_email}). Mailjet's " +
    "PUT is a PATCH — omitted fields are left alone. The email address cannot be changed.",
  params: [
    {
      key: "contact",
      label: "Contact ID or email",
      type: "string",
      required: true,
      hint: "Either form works: `1234` or `person@example.com`.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "isExcludedFromCampaigns",
      label: "Exclude from campaigns",
      type: "boolean",
      hint: "Account-wide marketing suppression. Transactional sends still reach them.",
    },
  ],
  output: [
    { key: "Data", type: "array", label: "Contact" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetContact>>(
      `/contact/${encodeURIComponent(input.contact)}`,
      {
        method: "PUT",
        body: compact({
          Name: input.name,
          IsExcludedFromCampaigns: input.isExcludedFromCampaigns,
        }),
      },
    );
  },
};

export default updateContact;
